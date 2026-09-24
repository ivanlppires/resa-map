# RESA Map — Deploy em produção (Coolify / servidor LAEGC)

| Item | Valor |
|---|---|
| Servidor | `root@179.197.236.155` (LAEGC), Coolify 4.x em `https://coolify.laegc.com.br` (`http://179.197.236.155:8000`) |
| Domínio | `https://resa.laegc.com.br` (DNS A → 179.197.236.155, zona no registro.br) |
| Fonte | GitHub `ivanlppires/resa-map`, branch `main`, build pack **dockercompose** (`/docker-compose.yml`) |
| Coolify | projeto `resa-map` (uuid `v4jyfnxzxemuiju4n3ji5wsn`), ambiente `production`, aplicação uuid **`3zksbvlsnlxcadpmwy0j0ton`** |
| Banco | Postgres do **resa-survey** (serviço `db` da app `bs8x9x7vbjwvqpwnxwhvyiu1`), acessado pela rede Docker externa `bs8x9x7vbjwvqpwnxwhvyiu1` com a role somente leitura `resa_map_ro` |

## Variáveis de ambiente (Coolify → aplicação resa-map)

| Nome | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://resa_map_ro:<senha>@db:5432/resa_survey` |
| `ACCESS_CODE` | código compartilhado que libera o mapa |
| `SESSION_SECRET` | string aleatória longa |

A role `resa_map_ro` foi criada em 2026-09-24 com `GRANT SELECT ON ALL TABLES IN SCHEMA public` + `ALTER DEFAULT PRIVILEGES`
(tabelas novas do resa-survey também ficam legíveis). Ela **não** consegue escrever.

## Deploy

Push em `main` e, se o webhook não estiver ligado, dispare pela API:

```bash
curl -X POST -H "Authorization: Bearer <TOKEN_COOLIFY>" \
  "http://179.197.236.155:8000/api/v1/deploy?uuid=3zksbvlsnlxcadpmwy0j0ton"
```

Verificação:

```bash
curl https://resa.laegc.com.br/api/health   # {"status":"ok","db":"connected"}
curl https://resa.laegc.com.br/api/stats
ssh root@179.197.236.155 'docker ps --format "{{.Names}}\t{{.Status}}" | grep resa-map'
```

## Observações da criação (2026-09-24)

- Criado via API (`POST /api/v1/projects`, `POST /api/v1/applications/public`). Descrições não aceitam travessão (`—`).
- `docker_compose_domains` só pode ser gravado depois que o Coolify conhece o compose: enviar `docker_compose_raw`
  (conteúdo do `docker-compose.yml`) junto no mesmo `PATCH`, ou deployar uma vez antes.
- Domínio via `PATCH /api/v1/applications/<uuid>` com `{"docker_compose_domains":[{"name":"app","domain":"https://resa.laegc.com.br"}]}`.

## Rede com o banco do resa-survey

O `docker-compose.yml` declara a rede externa `bs8x9x7vbjwvqpwnxwhvyiu1` e liga o serviço `app` a ela; dentro dessa rede o
Postgres responde como `db`. Se um redeploy do **resa-survey** recriar a rede (não acontece em redeploys normais — a rede é
por aplicação, não por container), basta redeployar o resa-map.

Conferir de dentro do container:

```bash
docker exec -it $(docker ps -qf name=resa-map) wget -qO- http://127.0.0.1:3000/api/health
```

## Rollback / desligar

No Coolify: *Stop* na aplicação. O resa-survey não depende do resa-map em nada (acesso é somente leitura).
