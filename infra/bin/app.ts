#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { BrotoPdfStack } from "../lib/broto-pdf-stack";

const app = new cdk.App();

new BrotoPdfStack(app, "BrotoPdf", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "sa-east-1",
  },
  description: "Broto PDF — Next.js + processamento de documentos em ECS Fargate.",
});
