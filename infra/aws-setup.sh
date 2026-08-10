#!/usr/bin/env bash
#
# Broto PDF — setup 100% da AWS a partir do zero.
#
# Cria, na SUA conta (usando o AWS CLI já configurado no seu terminal):
#   1. O provedor OIDC do GitHub Actions (se ainda não existir)
#   2. Uma IAM role de deploy assumível pelo GitHub Actions via OIDC
#   3. O bootstrap do CDK na conta/região
#
# Depois disso, você só cadastra no GitHub:
#   - Secret   AWS_DEPLOY_ROLE_ARN  (o script imprime o valor)
#   - Variable AWS_REGION           (a região usada)
# e o workflow ".github/workflows/deploy.yml" faz o deploy a cada push na main.
# A imagem Docker é construída no runner do GitHub (não precisa de Docker local).
#
# Uso:
#   ./infra/aws-setup.sh [REGIÃO] [OWNER/REPO]
#   ./infra/aws-setup.sh sa-east-1 brotosa/doc-broto
#
# Opcional: se você tiver o GitHub CLI (`gh`) autenticado, rode com --set-github
# para o script já cadastrar o secret e a variable no repositório para você:
#   ./infra/aws-setup.sh sa-east-1 brotosa/doc-broto --set-github
#
set -euo pipefail

REGION="${1:-sa-east-1}"
REPO="${2:-brotosa/doc-broto}"
SET_GITHUB="no"
for arg in "$@"; do [ "$arg" = "--set-github" ] && SET_GITHUB="yes"; done

ROLE_NAME="broto-pdf-github-deploy"
OIDC_HOST="token.actions.githubusercontent.com"

echo "==> Verificando pré-requisitos"
command -v aws >/dev/null || { echo "ERRO: AWS CLI não encontrado."; exit 1; }
command -v node >/dev/null || { echo "ERRO: Node.js não encontrado."; exit 1; }

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "    Conta AWS: $ACCOUNT"
echo "    Região:    $REGION"
echo "    Repo:      $REPO"

OIDC_ARN="arn:aws:iam::${ACCOUNT}:oidc-provider/${OIDC_HOST}"

echo "==> 1/3 Provedor OIDC do GitHub"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  echo "    Já existe: $OIDC_ARN"
else
  aws iam create-open-id-connect-provider \
    --url "https://${OIDC_HOST}" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" "1c58a3a8518e8759bf075b76b750d4f2df264fcd" \
    >/dev/null
  echo "    Criado: $OIDC_ARN"
fi

echo "==> 2/3 IAM role de deploy ($ROLE_NAME)"
TRUST="$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "${OIDC_ARN}" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "${OIDC_HOST}:aud": "sts.amazonaws.com" },
      "StringLike": {
        "${OIDC_HOST}:sub": [
          "repo:${REPO}:ref:refs/heads/main",
          "repo:${REPO}:environment:production"
        ]
      }
    }
  }]
}
JSON
)"

# Permissão mínima: assumir as roles criadas pelo CDK bootstrap (padrão CI/CD do CDK).
POLICY="$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AssumeCdkBootstrapRoles",
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::${ACCOUNT}:role/cdk-hnb659fds-*"
  }]
}
JSON
)"

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "    Role já existe — atualizando trust policy"
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST" >/dev/null
else
  aws iam create-role --role-name "$ROLE_NAME" \
    --description "Deploy da Broto PDF via GitHub Actions (OIDC)" \
    --assume-role-policy-document "$TRUST" >/dev/null
  echo "    Role criada"
fi
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "broto-pdf-cdk-deploy" \
  --policy-document "$POLICY" >/dev/null
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"
echo "    Role ARN: $ROLE_ARN"

echo "==> 3/3 CDK bootstrap (aws://${ACCOUNT}/${REGION})"
HERE="$(cd "$(dirname "$0")" && pwd)"
( cd "$HERE" && npm install --silent && npx cdk bootstrap "aws://${ACCOUNT}/${REGION}" )

echo ""
echo "======================================================================"
echo " Pronto! Lado AWS criado. Agora cadastre no GitHub (repo ${REPO}):"
echo ""
echo "   Secret   AWS_DEPLOY_ROLE_ARN = ${ROLE_ARN}"
echo "   Variable AWS_REGION          = ${REGION}"
echo ""
echo " Depois: re-execute o workflow 'Deploy (produção)' ou dê um push na main."
echo "======================================================================"

if [ "$SET_GITHUB" = "yes" ] && command -v gh >/dev/null; then
  echo "==> Cadastrando no GitHub via gh CLI"
  gh secret set AWS_DEPLOY_ROLE_ARN --repo "$REPO" --body "$ROLE_ARN"
  gh variable set AWS_REGION --repo "$REPO" --body "$REGION"
  echo "    Secret e variable cadastrados. Disparando o deploy..."
  gh workflow run "Deploy (produção)" --repo "$REPO" --ref main || \
    echo "    (Dispare manualmente em Actions se necessário.)"
elif [ "$SET_GITHUB" = "yes" ]; then
  echo "AVISO: --set-github pedido, mas o GitHub CLI (gh) não está instalado/autenticado."
fi
