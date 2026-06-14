# Progresso — Atena Logen

Este arquivo é a **memória de continuidade** entre sessões. No início de cada sessão, leia a
seção "Onde paramos" abaixo. No fim de cada sessão (ou ao concluir uma atividade), atualize-a.

O checklist granular de todas as fases/atividades/subtarefas vive em
[TASKS.md](TASKS.md) — é lá que marcamos o que está em execução, concluído, ou que vai sendo
adicionado conforme o trabalho avança. Este arquivo (`PROGRESS.md`) traz o resumo por fase e o
histórico de sessões; os dois devem estar sempre coerentes.

---

## Onde paramos

**Data:** 2026-06-14
**Fase atual:** Fase 0 — Fundação
**Próximo passo sugerido:** Atividade 0.3 (setup do backend: pool de conexões, Jest+Supertest,
estrutura de módulos, logger, middleware de erros).

---

## Status por fase

| Fase                            | Status          | Notas              |
| ------------------------------- | --------------- | ------------------ |
| 0 — Fundação                    | 🟡 em andamento | ver detalhe abaixo |
| 1 — Autenticação e entidades    | ⚪ não iniciada |                    |
| 2 — Motor de eventos e sessões  | ⚪ não iniciada |                    |
| 3 — Sincronização em tempo real | ⚪ não iniciada |                    |
| 4 — App mobile                  | ⚪ não iniciada |                    |
| 5 — Painel web administrativo   | ⚪ não iniciada |                    |
| 6 — Qualidade e produção        | ⚪ não iniciada |                    |

O detalhe subtarefa-a-subtarefa da Fase 0 (e de todas as demais fases) está em
[TASKS.md](TASKS.md).

---

## Log de sessões

### 2026-06-14 — Sessão 1

- Lido `docs/ATENA_LOGEN.md` (na época na raiz) e o schema SQL.
- Criado monorepo: `package.json` raiz com workspaces (`backend`, `shared`, `web`).
- `tsconfig.base.json` compartilhado (CommonJS, `strict: true`).
- `shared`: `EVENT_TYPE` e `EVENT_LAYER` em `src/constants/event-types.ts` (com `as const`).
- `backend`: Fastify 5 + rotas `/health` e `/event-types` (valida import do `@atena/shared`).
- ESLint flat config (`eslint.config.mjs`) + Prettier configurados e validados (`npm run lint`).
- `.gitignore`, `.env.example` (backend/web), `git init` + commit inicial.
- Reorganização para bater com a estrutura planejada (seção 10):
  `ATENA_LOGEN.md` → `docs/ATENA_LOGEN.md`, `atena_logen_schema.sql` →
  `backend/src/database/schema.sql`.
- Criados `CLAUDE.md` e os subagentes em `.claude/agents/`.
- **Aprendizados registrados**: npm workspaces, `tsconfig` com `extends`, `as const` +
  `keyof typeof` em TS, `tsx watch` para hot reload, ESLint flat config, por que Fastify 5
  (vulnerabilidade em dependência do Fastify 4).

### 2026-06-14 — Sessão 2

- Instalado e configurado **husky** (`prepare` script + `.husky/pre-commit`) e **lint-staged**
  (config em `package.json`, roda `eslint --fix` e `prettier --write` nos arquivos staged).
  Testado com um commit real (`fd8c5c8`) — confirmado que o hook formata automaticamente antes
  do commit.
- Criado workflow de CI em `.github/workflows/ci.yml` (GitHub Actions): em push para `master` e
  em PRs, roda `npm ci`, lint, build de `shared` e `backend`, e os testes de cada workspace.
- Corrigido bug pré-existente: `shared/tsconfig.json` não tinha `"composite": true`, exigido pelo
  project reference do `backend` (`tsc -b` falhava com TS6306).
- **Atividade 0.1 (Setup do repositório) concluída** — todas as subtarefas marcadas em
  [TASKS.md](TASKS.md).
- **Aprendizados registrados**: git hooks via husky (`.husky/_` é gerado e ignorado), lint-staged
  só roda nos arquivos staged, GitHub Actions (triggers `push`/`pull_request`, `actions/checkout`,
  `actions/setup-node` com cache de npm), `npm ci` vs `npm install`, TypeScript project references
  e `composite: true`.

### 2026-06-14 — Sessão 3

- **Atividade 0.2 (Setup do banco de dados) concluída** — todas as subtarefas marcadas em
  [TASKS.md](TASKS.md).
- Provisionados (pelo usuário, fora desta sessão) os bancos Neon `atena_logen_dev` e
  `atena_logen_test`, com `backend/.env` (gitignored) e `backend/knexfile.ts` já configurados.
- Criadas **10 migrations Knex** em `backend/src/database/migrations/`, dividindo o
  `schema.sql` por camadas: extensão `uuid-ossp` + hierarquia geográfica (company/plant/sector);
  address_type (com coluna gerada `total_positions`) + address; tag (ENUM `tag_type_enum`) + FK
  pendente em `address.tag_id`; product + pallet_type (ENUM `asset_type_enum`); pallet (com
  `chk_location`/`chk_position`) + pallet_product; user/device/forklift (ENUM `user_role_enum`);
  user_session (`chk_session_end`); event_type (ENUM `event_layer_enum`, com seed dos 8 tipos) +
  event + índice único parcial `idx_event_offline_uuid`; demais índices; e as 3 views
  (`v_address_occupation`, `v_pallet_location`, `v_sync_queue`).
- Corrigido bug pré-existente em `backend/package.json`: os scripts `db:*` apontavam para
  `node_modules/knex/bin/cli.js`, que não existe dentro de `backend/` (o Knex fica hoisted no
  `node_modules` da raiz em npm workspaces) — ajustado para `../node_modules/knex/bin/cli.js`.
- Migrations aplicadas com sucesso em dev e test (`npm run db:migrate` /
  `npm run db:migrate:test`, ambos "Batch 1 run: 10 migrations").
- Criado seed de desenvolvimento `backend/src/database/seeds/01_dev_seed.ts` (idempotente via
  IDs fixos + `del()` em ordem reversa de FK): 1 company, 1 plant, 3 sectors, 2 address_type
  (porta-pallet 3 níveis e blocado 2x2), 3 address, 5 tags (3 de endereço associadas via
  `address.tag_id`, 2 de pallet), 1 pallet_type, 3 pallets (2 empilhados em A-01-01 nas posições
  1 e 2, 1 solto via GPS), 2 products e 4 pallet_product. Executado 2x no banco de dev para
  confirmar idempotência (sem erros de duplicidade).
- Validado via script `tsx` temporário (removido ao final): as 3 views retornam dados coerentes
  com o seed, `address_type.total_positions` calcula corretamente (1×3=3, 4×1=4), `event_type`
  tem os 8 tipos esperados, e violações de `tag.epc` UNIQUE, `chk_location`, `chk_position` e
  `tag_type_enum` são rejeitadas pelo banco (testado em transações com rollback).
- `npm run lint` e `npm run build --workspace=backend` passam sem erros.
- **Aprendizados registrados**: sistema de migrations do Knex (timestamps como ordenação +
  tabela `knex_migrations` como "livro de registro" do que já foi aplicado, `up`/`down`
  simétricos), `knex.raw()` para o que o schema builder não cobre (extensões, ENUMs nativos via
  `useNative`, colunas geradas `STORED`, views, índices parciais/com `DESC`), seeds vs.
  migrations (seeds = dados de demo/dev, idempotentes via `del()` + IDs fixos; migrations =
  estrutura/catálogo), e diferença entre query builder (`db('tabela').select(...)`, traduzido
  para SQL parametrizado) e `knex.raw()` (SQL puro, sem abstração).
