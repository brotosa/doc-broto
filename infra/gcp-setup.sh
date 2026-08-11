#!/usr/bin/env bash
#
# Broto PDF — setup do Google Cloud Run a partir do zero.
#
# Feito para rodar no GOOGLE CLOUD SHELL (navegador, sem instalar nada):
#   https://shell.cloud.google.com
#
# Cria, na sua conta:
#   1. As APIs necessárias (Run, Artifact Registry, IAM, STS)
#   2. Um repositório de imagens no Artifact Registry
#   3. Uma service account de deploy
#   4. Workload Identity Federation (OIDC) para o GitHub Actions autenticar SEM chave
#
# Ao final, imprime os valores para cadastrar no GitHub. Depois, o workflow
# ".github/workflows/deploy-cloudrun.yml" faz build + deploy a cada push na main.
#
# Uso:
#   ./infra/gcp-setup.sh PROJECT_ID [REGIÃO] [OWNER/REPO]
#   ./infra/gcp-setup.sh meu-projeto-123 southamerica-east1 brotosa/doc-broto
#
set -euo pipefail

PROJECT="${1:?Uso: ./gcp-setup.sh PROJECT_ID [REGIAO] [OWNER/REPO]}"
REGION="${2:-southamerica-east1}"   # São Paulo
REPO="${3:-brotosa/doc-broto}"

SA_NAME="gh-deploy"
POOL="github"
PROVIDER="github-oidc"
AR_REPO="doc-broto"

echo "==> Projeto: $PROJECT | Região: $REGION | Repo: $REPO"
gcloud config set project "$PROJECT" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

echo "==> 1/5 Habilitando APIs (pode levar ~1 min)"
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com >/dev/null

echo "==> 2/5 Artifact Registry ($AR_REPO)"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker --location="$REGION" \
    --description="Imagens da Broto PDF" >/dev/null

echo "==> 3/5 Service account ($SA_EMAIL)"
gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="GitHub Actions deploy (Broto PDF)" >/dev/null

echo "==> 4/5 Papéis de deploy"
for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${SA_EMAIL}" --role="$ROLE" --condition=None >/dev/null
done

echo "==> 5/5 Workload Identity Federation (OIDC do GitHub)"
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "$POOL" \
    --location=global --display-name="GitHub" >/dev/null

gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --display-name="GitHub OIDC" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com" >/dev/null

# Só o seu repositório pode assumir a service account.
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}" >/dev/null

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"

echo ""
echo "======================================================================"
echo " Pronto! Cadastre no GitHub (repo ${REPO}):"
echo "   Settings > Secrets and variables > Actions"
echo ""
echo "   [Variables]"
echo "     GCP_PROJECT_ID   = ${PROJECT}"
echo "     GCP_REGION       = ${REGION}"
echo ""
echo "   [Secrets]"
echo "     GCP_WIF_PROVIDER = ${WIF_PROVIDER}"
echo "     GCP_DEPLOY_SA    = ${SA_EMAIL}"
echo ""
echo " Depois: aba Actions > 'Deploy Cloud Run (produção)' > Run workflow"
echo " (ou faça um push na main). A URL pública sai no fim do job."
echo "======================================================================"
