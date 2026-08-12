# Broto PDF — Custos do Projeto

_Resumo dos custos de hospedagem e operação. Valores em USD (cobrança da AWS é em dólar) com estimativa em BRL a ~R$ 5,40/US$. Atualizado em 12/08/2026._

## Resumo rápido

| | Mensal | Anual |
|---|---:|---:|
| **Total estimado** | **≈ US$ 12,50** | **≈ US$ 150** |
| **Em reais (aprox.)** | **≈ R$ 68** | **≈ R$ 810** |

> É praticamente só a instância. Não há custo de licença, de IA/API nem de certificado.

---

## Detalhamento mensal

| Item | O que é | Custo/mês (USD) | Observação |
|---|---|---:|---|
| **AWS Lightsail — instância** | Servidor `small_3_1`: 2 GB RAM, 2 vCPU, 60 GB SSD, 3 TB de tráfego | **US$ 12,00** | Preço fixo, tudo incluso |
| **IP estático** | 1 IP público fixo (18.231.243.131) | US$ 0,00 | Grátis enquanto atrelado à instância ativa |
| **Route 53 — zona DNS** | Hosted zone do `broto.com.br` | US$ 0,50 | **US$ 0** se a zona já existir (subdomínio não cria zona nova) |
| **Route 53 — consultas** | Resolução do `docs.broto.com.br` | ~US$ 0,00 | Centavos no volume esperado |
| **Certificado HTTPS (TLS)** | Let's Encrypt via Caddy | US$ 0,00 | Automático e renova sozinho |
| **GitHub (repositório + Actions)** | CI e deploy automático | US$ 0,00 | Plano gratuito |
| **APIs de IA** | Removidas do projeto | US$ 0,00 | Sem custo recorrente |
| **Total** | | **≈ US$ 12,00–12,50/mês** | |

---

## Custos que ficam fora deste total

| Item | Custo | Observação |
|---|---|---|
| **Domínio `broto.com.br`** | ~R$ 40/ano (.com.br) | Já é da Broto — registro anual pago à parte, não faz parte deste projeto |
| **Máquina local (Windows)** | — | Uso do PowerShell/navegador; sem custo |

---

## Opcionais (se um dia quiser)

| Item | Custo estimado | Quando faz sentido |
|---|---:|---|
| **Backup automático (snapshots)** | ~US$ 0,05/GB-mês → ~US$ 1/mês (≈18 GB usados) | Para ter cópias automáticas da máquina/banco |
| **Upgrade para 4 GB RAM** | US$ 24,00/mês | Só se OCR/conversões pesadas ficarem lentas com vários usuários simultâneos |

---

## Notas

- **Câmbio:** a AWS cobra em **dólar**; o valor em reais varia com a cotação e com IOF do cartão. Use ~R$ 5,40/US$ apenas como referência.
- **Tráfego:** o plano inclui **3 TB/mês** — folga enorme para o uso de uma ferramenta interna; excedente é improvável.
- **Sem surpresas de escala:** por ser instância única de preço fixo (não é "por uso"), a conta não sobe com o número de conversões — só se você **trocar** o plano da instância.
- **O que mantém o custo baixo:** processamento de PDF no navegador quando possível, arquivos descartados após o uso (nada é armazenado), certificado gratuito (Let's Encrypt) e deploy gratuito (GitHub Actions).
