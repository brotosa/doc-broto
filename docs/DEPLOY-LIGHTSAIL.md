# Deploy na AWS Lightsail (app + Postgres, custo baixo)

Roda tudo numa **única instância Lightsail** com Docker: o app Next.js e o Postgres
(com volume persistente). IP e tráfego inclusos. Custo a partir de **~US$ 12/mês**
(plano 2 GB + swap, criado pelo script).

## 1. Criar a instância
No console (https://lightsail.aws.amazon.com) → **Create instance**:
- Região: **São Paulo (sa-east-1)**
- Plataforma: **Linux/Unix** → **OS Only** → **Ubuntu 22.04 LTS**
- Plano:
  - **2 GB / 2 vCPU (~US$ 12/mês)** — econômico. O script cria **3 GB de swap** para aguentar picos de OCR/LibreOffice. Ideal para uso interno leve.
  - **4 GB / 2 vCPU (~US$ 24/mês)** — folgado, se houver uso simultâneo pesado.
- Nome: `broto-pdf` → **Create**

> Preferindo CLI (precisa do AWS CLI configurado) — `small_2_0` = 2 GB, `medium_2_0` = 4 GB:
> ```bash
> aws lightsail create-instances --instance-names broto-pdf \
>   --availability-zone sa-east-1a --blueprint-id ubuntu_22_04 \
>   --bundle-id small_2_0 --region sa-east-1
> ```

## 2. Abrir a porta 80 (HTTP)
Na instância → aba **Networking** → **IPv4 Firewall** → **Add rule** → **HTTP (80)** → salvar.

> CLI: `aws lightsail open-instance-public-ports --instance-name broto-pdf --region sa-east-1 --port-info fromPort=80,toPort=80,protocol=TCP`

## 3. Entrar e rodar o setup
Abra o terminal SSH da instância (botão no console) e:

```bash
git clone https://github.com/brotosa/doc-broto.git
cd doc-broto
./infra/lightsail-setup.sh
```

- Repositório privado: informe seu usuário do GitHub e um **token** (PAT) quando o `git clone` pedir senha.
- O script instala o Docker, gera o `.env` (com segredos aleatórios) e sobe app + Postgres.
- **Anote a senha do admin** que ele imprime no final.

Ao terminar, acesse **http://SEU_IP** (o IP público aparece no console e no fim do script)
e entre com **admin** + a senha gerada. Troque a senha no primeiro acesso.

## 4. Ligar a IA (opcional)
Edite `.env`, preencha `ANTHROPIC_API_KEY=sk-ant-...` e rode:
```bash
sudo docker compose -f docker-compose.prod.yml up -d
```

## Atualizar depois
```bash
cd doc-broto && git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

## HTTPS + subdomínio (Route 53) — quando quiser
O app já vem com **Caddy** na frente, que emite **certificado Let's Encrypt
automaticamente** (grátis) e **não tem limite de timeout** (importante para OCR/
conversões longas). Passos:

1. **IP estático:** na instância → Networking → **Create static IP** → anexe. Use esse IP.
2. **Abrir a porta 443** no firewall do Lightsail (HTTPS), além da 80.
3. **Route 53:** no hosted zone, crie um registro **A** do subdomínio
   (ex.: `pdf.suaempresa.com.br`) apontando para o **IP estático**.
4. Na instância, edite `.env`: `DOMAIN=pdf.suaempresa.com.br` e `COOKIE_SECURE=true`, e rode:
   ```bash
   sudo docker compose -f docker-compose.prod.yml up -d
   ```
   (`COOKIE_SECURE=true` só em HTTPS; em HTTP puro deixe `false`, senão o login não persiste.)
   O Caddy emite o certificado no primeiro acesso (aguarde ~1 min). Pronto: `https://…`.

> A porta 80 continua aberta (o Caddy a usa para o desafio ACME e para redirecionar
> HTTP→HTTPS). Nada de certificado manual.

## Custo
- Instância Lightsail **2 GB: ~US$ 12/mês** (com swap) ou **4 GB: ~US$ 24/mês** — inclui IP e franquia de tráfego.
- Postgres e auth: **US$ 0** (rodam na mesma instância).
- Snapshots automáticos (opcional): +~US$ 2–5/mês.

> Piso realista na AWS para este app é ~US$ 12/mês (2 GB). Planos de 1 GB/512 MB
> não rodam LibreOffice/Chromium de forma confiável, mesmo com swap. Parar a
> instância não reduz o custo no Lightsail (cobra-se pelo plano enquanto existir).
