# RESA Map — Plataforma Territorial

Interface de navegação em mapa para os dados coletados pelo [RESA Survey](https://github.com/ivanlppires/resa-survey)
no projeto **RESA** (Viabilidade Econômica de Assentamentos Rurais nos Três Biomas de Mato Grosso — UNEMAT / LAEGC).
Inspirada na [Plataforma da Fundação Florestal (SP)](https://plataforma.fflorestal.sp.gov.br/).

Produção: **https://resa.laegc.com.br** (landing page) · **https://resa.laegc.com.br/mapa** (plataforma, código de acesso).

## O que faz

- **Mapa navegável** (MapLibre GL) com mapas base satélite / ruas / relevo / claro / escuro.
- **Camadas** ligáveis: limite de MT, municípios e biomas (IBGE), municípios pesquisados, assentamentos (área de referência),
  entrevistas (pontos coloridos por qualquer pergunta), agrupamento e mapa de calor.
- **Filtros** por assentamento, município, bioma, GPS e por qualquer resposta do questionário (contagens facetadas).
- **Painel** com indicadores e distribuições recalculados para o recorte, comparação entre assentamentos.
- **Ficha da entrevista** ao clicar no ponto (68 perguntas em 3 eixos).
- **Exportação** do recorte: relatório PDF com gráficos, XLSX, CSV e GeoJSON.
- **Busca** por assentamento, município ou lote.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind 4 + MapLibre GL 5 + Recharts |
| Backend | Fastify 5 + postgres-js (somente leitura no banco do resa-survey) |
| Geodados | Malhas IBGE (estado, municípios, biomas) em `web/public/geo/` |
| Deploy | Docker (compose) no Coolify do servidor LAEGC, atrás do Traefik |

## Desenvolvimento

```bash
npm install
# túnel para o banco de produção (somente leitura) — ou aponte DATABASE_URL para um Postgres local
ssh -N -L 15432:10.0.2.3:5432 root@179.197.236.155 &
cp server/.env.example server/.env   # ajuste DATABASE_URL / ACCESS_CODE
npm run dev            # API em :3100 (tsx watch) + Vite em :5180 com proxy /api
```

Build de produção: `npm run build` (gera `server/dist` e `web/dist`); `STATIC_DIR=../web/dist npm start -w server`
serve tudo em uma porta só.

## Variáveis de ambiente (server)

| Nome | Descrição |
|---|---|
| `DATABASE_URL` | Postgres do resa-survey. Em produção usa a role **`resa_map_ro`** (somente SELECT) via rede Docker `bs8x9x7vbjwvqpwnxwhvyiu1`, host `db`. |
| `ACCESS_CODE` | Código compartilhado que libera `/mapa` e `/api/data|export|report`. Vazio = acesso aberto. |
| `SESSION_SECRET` | Segredo do cookie de acesso. |
| `STATIC_DIR` | Pasta do build do frontend servida pelo Fastify (produção). |
| `PORT` | Porta (3000 no container, 3100 em dev). |

## API

- `GET /api/health` — status e conexão com o banco.
- `GET /api/stats` — números agregados públicos (landing page).
- `POST /api/access {code}` / `GET /api/session` / `POST /api/logout` — portão de acesso.
- `GET /api/data` — perguntas, assentamentos e entrevistas sincronizadas (respostas achatadas).
- `GET /api/export.csv|xlsx|geojson?ids=1,2,3` — exportação do recorte.
- `GET /api/report.pdf?ids=…&filters=…&title=…` — relatório territorial agregado.

## Deploy

Push em `main` + deploy no Coolify (ver `docs/deploy.md`).
