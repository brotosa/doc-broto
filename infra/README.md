# Broto PDF — Infraestrutura (AWS CDK)

Provisiona a aplicação na AWS: **VPC → ECS Fargate → Application Load Balancer**.
A imagem Docker (Next.js + LibreOffice + qpdf + ghostscript + tesseract + Chromium)
é construída a partir do `Dockerfile` na raiz do repositório durante o deploy.

## Pré-requisitos

- Conta AWS e credenciais configuradas (`aws configure` ou variáveis de ambiente).
- Node.js 22 e Docker instalados localmente (o CDK constrói a imagem no deploy).
- CDK bootstrap na conta/região (uma vez): `npx cdk bootstrap`.

## Setup do zero (recomendado) — script automático

Se você ainda **não tem nada configurado na AWS** e já usa o AWS CLI no seu
terminal, rode o script turnkey (cria provedor OIDC + role de deploy + bootstrap):

```bash
./infra/aws-setup.sh sa-east-1 brotosa/doc-broto
```

Ao final, ele imprime os **2 valores** para você cadastrar no GitHub
(Settings → Secrets and variables → Actions):

- **Secret** `AWS_DEPLOY_ROLE_ARN`
- **Variable** `AWS_REGION`

Depois, re-execute o workflow **"Deploy (produção)"** (ou dê um push na `main`).
A imagem Docker é construída no runner do GitHub — **não precisa de Docker local**.

> Se você tiver o GitHub CLI (`gh`) autenticado, rode com `--set-github` que o
> script já cadastra o secret/variable e dispara o deploy:
> `./infra/aws-setup.sh sa-east-1 brotosa/doc-broto --set-github`

A role usa permissão mínima (`sts:AssumeRole` nas roles do CDK bootstrap). Se
algum recurso exigir mais permissão no primeiro deploy, amplie a policy inline
`broto-pdf-cdk-deploy` da role `broto-pdf-github-deploy`.

## Deploy manual

```bash
cd infra
npm install
export CDK_DEFAULT_ACCOUNT=<sua-conta>
export CDK_DEFAULT_REGION=sa-east-1        # São Paulo
npx cdk bootstrap                          # apenas na primeira vez
npm run deploy
```

Ao final, a saída `BrotoPdf.LoadBalancerUrl` traz a URL pública.

## Habilitar as ferramentas de IA

O stack cria um segredo `broto-pdf/anthropic-api-key` (vazio). Preencha-o com a
chave da Anthropic e reinicie o serviço:

```bash
aws secretsmanager put-secret-value \
  --secret-id broto-pdf/anthropic-api-key \
  --secret-string 'SUA_CHAVE_ANTHROPIC'
aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment
```

As demais ferramentas (juntar, converter Office, comprimir, OCR, proteger, etc.)
funcionam **sem** a chave.

## Deploy automático (produção = `main`)

O workflow `.github/workflows/deploy.yml` executa `cdk deploy` a cada push na
branch **`main`**. Configure no repositório:

- **Secret** `AWS_DEPLOY_ROLE_ARN` — role da AWS assumível via OIDC com permissão de deploy.
- **Variable** `AWS_REGION` — ex.: `sa-east-1`.

## Recursos criados

| Recurso | Detalhe |
| --- | --- |
| VPC | 2 AZs, 1 NAT Gateway |
| ECS Fargate | 2 vCPU / 4 GB, 1–4 tarefas (autoscaling por CPU) |
| ALB | público, health check em `/`, idle timeout 300s |
| Secrets Manager | `broto-pdf/anthropic-api-key` |
| CloudWatch Logs | prefixo `broto-pdf`, retenção 30 dias |

## HTTPS / domínio

Para produção com domínio próprio, associe um certificado ACM e um listener 443
ao ALB (ou coloque um CloudFront/Route 53 à frente). Posso adicionar isso ao stack
informando o domínio e a zona hospedada.

## Escalar o processamento pesado

Hoje tudo roda numa imagem. Para alto volume, o processamento (LibreOffice/OCR)
pode ser extraído para um **serviço worker** separado (fila SQS + Fargate),
mantendo o front leve. A lógica já está isolada em `src/lib/server/`.
