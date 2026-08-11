# Broto PDF — Deploy no Google Cloud Run (grátis / baixo custo)

Alternativa mais barata à AWS. O app roda como container no **Cloud Run**, que
**escala a zero** (não paga quando ninguém usa) e tem free tier generoso.
O build + deploy acontecem no **GitHub Actions** — você **não precisa instalar
nada** na sua máquina.

## Passo a passo

### 1. Crie um projeto e ative o billing
No console (https://console.cloud.google.com):
- Crie um **projeto** (anote o *Project ID*).
- Em **Billing**, associe uma forma de pagamento. É exigido mesmo no free tier;
  dentro dos limites gratuitos **não há cobrança**. (Recomendado: crie um
  **alerta de orçamento** de US$ 5 em *Billing > Budgets & alerts*.)

### 2. Rode o setup no Cloud Shell (navegador, sem instalar nada)
Abra o **Cloud Shell**: https://shell.cloud.google.com — depois:

```bash
git clone https://github.com/brotosa/doc-broto.git
cd doc-broto
./infra/gcp-setup.sh SEU_PROJECT_ID southamerica-east1 brotosa/doc-broto
```

O script habilita as APIs, cria o Artifact Registry, a service account e o
Workload Identity Federation (OIDC). No fim, ele imprime 2 variables e 2 secrets.

### 3. Cadastre no GitHub
Em **Settings > Secrets and variables > Actions** do repositório:

| Tipo | Nome | Valor (o script imprime) |
| --- | --- | --- |
| Variable | `GCP_PROJECT_ID` | seu project id |
| Variable | `GCP_REGION` | `southamerica-east1` |
| Secret | `GCP_WIF_PROVIDER` | `projects/.../providers/github-oidc` |
| Secret | `GCP_DEPLOY_SA` | `gh-deploy@...iam.gserviceaccount.com` |

### 4. Faça o deploy
Aba **Actions > "Deploy Cloud Run (produção)" > Run workflow** (ou dê um push na
`main`). Ao final do job aparece a **URL pública** (`https://doc-broto-...run.app`).

## IA (opcional)
As ferramentas *Resumir / Traduzir / PDF→Markdown* usam a `ANTHROPIC_API_KEY`.
Para ligá-las, defina a variável no serviço (Secret Manager é o ideal):

```bash
gcloud run services update doc-broto \
  --region southamerica-east1 \
  --update-env-vars ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Custo
- Compute: **escala a zero**; free tier cobre uso pessoal/teste → ~US$ 0.
- Armazenamento da imagem (Artifact Registry): centavos/mês.
- Teto de gastos: o workflow usa `--max-instances 3`. Configure também um alerta
  de orçamento no console para tranquilidade.
