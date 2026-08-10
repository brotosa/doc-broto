import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";

/**
 * Infra da Broto PDF:
 *   VPC -> ECS Fargate (imagem construída do Dockerfile) -> Application Load Balancer público.
 * A chave da IA fica no Secrets Manager e é injetada no container em runtime.
 */
export class BrotoPdfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Rede: 2 AZs, com NAT para o Fargate baixar/atualizar.
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2, natGateways: 1 });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc, containerInsights: true });

    // Segredo para a chave da Anthropic (preencha o valor após o deploy).
    const aiSecret = new secretsmanager.Secret(this, "AnthropicApiKey", {
      secretName: "broto-pdf/anthropic-api-key",
      description: "ANTHROPIC_API_KEY usada pelas ferramentas de IA da Broto PDF.",
    });

    // Imagem construída a partir do Dockerfile na raiz do repositório.
    const image = ecs.ContainerImage.fromAsset(path.join(__dirname, "..", ".."), {
      platform: cdk.aws_ecr_assets.Platform.LINUX_AMD64,
    });

    // Serviço Fargate + ALB. LibreOffice/OCR pedem memória — 2 vCPU / 4 GB.
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      cpu: 2048,
      memoryLimitMiB: 4096,
      desiredCount: 1,
      publicLoadBalancer: true,
      taskImageOptions: {
        image,
        containerPort: 3000,
        environment: {
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
        },
        secrets: {
          ANTHROPIC_API_KEY: ecs.Secret.fromSecretsManager(aiSecret),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "broto-pdf",
          logRetention: logs.RetentionDays.ONE_MONTH,
        }),
      },
      // Conversões grandes podem demorar; o ALB precisa de idle timeout maior.
      idleTimeout: cdk.Duration.seconds(300),
    });

    // Health check na home.
    service.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10),
    });

    // Uploads de até 100 MB podem levar tempo — deregistration mais curta.
    service.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "30");

    // Autoscaling por CPU (1 a 4 tarefas).
    const scaling = service.service.autoScaleTaskCount({ minCapacity: 1, maxCapacity: 4 });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 65,
      scaleInCooldown: cdk.Duration.seconds(120),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    new cdk.CfnOutput(this, "LoadBalancerUrl", {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
      description: "URL pública da aplicação (aponte seu domínio/HTTPS para cá).",
    });
    new cdk.CfnOutput(this, "AnthropicSecretArn", {
      value: aiSecret.secretArn,
      description: "Preencha este segredo com a ANTHROPIC_API_KEY para habilitar a IA.",
    });
  }
}
