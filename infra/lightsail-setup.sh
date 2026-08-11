#!/usr/bin/env bash
#
# Broto PDF — setup na instância AWS Lightsail (Ubuntu).
#
# Roda NA INSTÂNCIA (via SSH), a partir da pasta do repositório já clonado:
#   git clone https://github.com/brotosa/doc-broto.git
#   cd doc-broto
#   ./infra/lightsail-setup.sh
#
# O que faz:
#   1. Instala o Docker (+ plugin compose), se necessário.
#   2. Gera um .env com segredos aleatórios (guarde a senha do admin impressa!).
#   3. Faz build da imagem e sobe app + Postgres (docker-compose.prod.yml).
#
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 1/3 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

echo "==> 2/3 Configuração (.env)"
if [ ! -f .env ]; then
  ADMIN_PW="$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | cut -c1-12)"
  cat > .env <<EOF
# Gerado por lightsail-setup.sh
AUTH_SECRET=$(openssl rand -base64 48)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PW}
ADMIN_NAME=Administrador
# Opcional: chave da IA (Resumir/Traduzir/PDF->Markdown). Deixe em branco para desativar.
ANTHROPIC_API_KEY=
EOF
  echo ""
  echo "   ****************************************************************"
  echo "   *  Usuário admin: admin"
  echo "   *  Senha admin:   ${ADMIN_PW}"
  echo "   *  (guarde agora! troque após o 1º login)"
  echo "   ****************************************************************"
  echo ""
else
  echo "   .env já existe — mantendo o atual."
fi

echo "==> 3/3 Build e subida (primeira vez demora ~8-15 min)"
sudo docker compose -f docker-compose.prod.yml up -d --build

IP="$(curl -s --max-time 5 ifconfig.me || echo 'SEU_IP_PUBLICO')"
echo ""
echo "======================================================================"
echo " Pronto! Acesse:  http://${IP}"
echo " Entre com usuário 'admin' e a senha mostrada acima."
echo ""
echo " Comandos úteis:"
echo "   sudo docker compose -f docker-compose.prod.yml logs -f web   # logs"
echo "   sudo docker compose -f docker-compose.prod.yml restart web   # reiniciar"
echo "   git pull && sudo docker compose -f docker-compose.prod.yml up -d --build  # atualizar"
echo "======================================================================"
