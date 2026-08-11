# Autenticação (login próprio + Postgres)

Login com **e-mail e senha**, dois perfis (**admin** e **comum**) e **aprovação
do admin** para novos cadastros. O app inteiro exige login.

## Como funciona
- **Login/senha** validados no servidor com **bcrypt** (senha nunca em texto puro).
- **Sessão** por cookie **httpOnly** assinado (JWT, validade 4h). Logout limpa o cookie.
- **Cadastro** entra como *pendente*; só acessa após o admin **aprovar**.
- **Painel do admin** (`/admin`, menu "Configurações"): aprovar, ativar/desativar,
  mudar tipo (admin↔comum), redefinir senha e excluir usuários + **log de auditoria**.
- **Anti-força-bruta**: 5 senhas erradas bloqueiam o usuário por 15 min.
- **Troca de senha no 1º acesso**: usuários criados pelo admin usam senha provisória
  e definem a própria senha ao entrar.

## Variáveis de ambiente
Copie `.env.example` para `.env` e preencha:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Conexão Postgres. **Vazio = armazenamento em memória** (só dev; some ao reiniciar). |
| `PGSSL` | `off` para Postgres local (sem SSL). Padrão: exige SSL. |
| `AUTH_SECRET` | Segredo para assinar o cookie de sessão (string aleatória longa). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Primeiro admin (login por e-mail), criado no 1º acesso. |

Gere um segredo forte, por exemplo: `openssl rand -base64 48`.

## Rodar localmente (sem Postgres)
Deixe `DATABASE_URL` **em branco**: os usuários ficam em memória (ideal para testar a
tela de login). O primeiro admin é criado a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

```bash
# .env
AUTH_SECRET=um-segredo-qualquer-bem-grande
ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=admin123
```

## Produção (AWS Lightsail, na mesma instância)
Instale o Postgres na instância e crie o banco:

```bash
sudo apt-get update && sudo apt-get install -y postgresql
sudo -u postgres psql -c "CREATE USER broto WITH PASSWORD 'senha-forte';"
sudo -u postgres psql -c "CREATE DATABASE broto OWNER broto;"
```

No `.env` do app (mesma máquina):
```bash
DATABASE_URL=postgres://broto:senha-forte@localhost:5432/broto
PGSSL=off                     # Postgres local não usa SSL
AUTH_SECRET=<openssl rand -base64 48>
ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=<senha-forte-do-admin>
ADMIN_NAME=Administrador
```

As tabelas (`users`, `audit`) são criadas automaticamente no primeiro acesso.
Troque a senha do admin logo após o primeiro login (menu do usuário → redefinir).

> Se um dia usar um Postgres **gerenciado** (RDS/Neon), basta trocar a `DATABASE_URL`
> e remover `PGSSL=off` (eles exigem SSL). O restante continua igual.
