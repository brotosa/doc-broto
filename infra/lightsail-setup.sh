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

# E-mail do primeiro admin (login é por e-mail). Pode passar como argumento:
#   ./infra/lightsail-setup.sh admin@suaempresa.com.br
ADMIN_EMAIL_INPUT="${1:-admin@broto.local}"

echo "==> 1/4 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

echo "==> 2/4 Swap (memória extra p/ conversões pesadas em instâncias pequenas)"
if ! sudo swapon --show | grep -q .; then
  sudo fallocate -l 3G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=3072
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  sudo sysctl -w vm.swappiness=20 >/dev/null || true
  echo "   swap de 3 GB criado (torna o plano de 2 GB viável)."
else
  echo "   swap já ativo."
fi

echo "==> 3/4 Configuração (.env)"
if [ ! -f .env ]; then
  ADMIN_PW="$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | cut -c1-12)"
  cat > .env <<EOF
# Gerado por lightsail-setup.sh
AUTH_SECRET=$(openssl rand -base64 48)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')
ADMIN_EMAIL=${ADMIN_EMAIL_INPUT}
ADMIN_PASSWORD=${ADMIN_PW}
ADMIN_NAME=Administrador
# Opcional: subdomínio para HTTPS automático (ex.: pdf.suaempresa.com.br).
# Deixe em branco para servir em HTTP pelo IP. Ao preencher, rode o compose de novo.
DOMAIN=
# Marque true APENAS quando servir por HTTPS (com DOMAIN). Em HTTP puro deixe false,
# senão o navegador descarta o cookie de sessão e o login não "gruda".
COOKIE_SECURE=false
EOF
  echo ""
  echo "   ****************************************************************"
  echo "   *  E-mail admin: ${ADMIN_EMAIL_INPUT}"
  echo "   *  Senha admin:  ${ADMIN_PW}"
  echo "   *  (guarde agora! troque após o 1º login)"
  echo "   ****************************************************************"
  echo ""
else
  echo "   .env já existe — mantendo o atual."
fi

echo "==> 4/4 Build e subida (primeira vez demora ~8-15 min)"
sudo docker compose -f docker-compose.prod.yml up -d --build

IP="$(curl -4 -s --max-time 5 ifconfig.me || echo 'SEU_IP_PUBLICO')"
DOMAIN_SET="$(grep -E '^DOMAIN=.+' .env || true)"
echo ""
echo "======================================================================"
if [ -n "$DOMAIN_SET" ]; then
  echo " Pronto! Acesse:  https://${DOMAIN_SET#DOMAIN=}"
  echo " (o Caddy emite o certificado Let's Encrypt no 1º acesso — aguarde ~1 min)"
else
  echo " Pronto! Acesse:  http://${IP}"
  echo ""
  echo " Para HTTPS com domínio (Route 53):"
  echo "   1. Aponte um registro A do subdomínio para ${IP} (use IP estático!)."
  echo "   2. Abra a porta 443 no firewall do Lightsail."
  echo "   3. No .env: preencha DOMAIN=seu.subdominio e troque COOKIE_SECURE=true, e rode:"
  echo "        sudo docker compose -f docker-compose.prod.yml up -d"
fi
echo " Entre com o e-mail do admin e a senha mostrada acima."
echo ""
echo " Comandos úteis:"
echo "   sudo docker compose -f docker-compose.prod.yml logs -f        # logs"
echo "   sudo docker compose -f docker-compose.prod.yml restart        # reiniciar"
echo "   git pull && sudo docker compose -f docker-compose.prod.yml up -d --build  # atualizar"
echo "======================================================================"
