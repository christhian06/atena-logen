# Progresso — Atena Logen

Este arquivo é a **memória de continuidade** entre sessões. No início de cada sessão, leia a
seção "Onde paramos" abaixo. No fim de cada sessão (ou ao concluir uma atividade), atualize-a.

O checklist completo de atividades está na seção 9 de [ATENA_LOGEN.md](ATENA_LOGEN.md) — aqui só
registramos o **status real** e decisões/aprendizados relevantes.

---

## Onde paramos

**Data:** 2026-06-14
**Fase atual:** Fase 0 — Fundação
**Próximo passo sugerido:** Atividade 0.1.3/0.1.4 (git hooks + CI) **ou** Atividade 0.2 (setup do
banco de dados / Knex) — a decidir com o usuário na próxima sessão.

---

## Status por fase

| Fase | Status | Notas |
|------|--------|-------|
| 0 — Fundação | 🟡 em andamento | ver detalhe abaixo |
| 1 — Autenticação e entidades | ⚪ não iniciada | |
| 2 — Motor de eventos e sessões | ⚪ não iniciada | |
| 3 — Sincronização em tempo real | ⚪ não iniciada | |
| 4 — App mobile | ⚪ não iniciada | |
| 5 — Painel web administrativo | ⚪ não iniciada | |
| 6 — Qualidade e produção | ⚪ não iniciada | |

### Fase 0 — detalhe

- [x] 0.1.1 Monorepo criado (`backend`, `shared`, `web`, npm workspaces)
- [x] 0.1.2 ESLint (flat config) + Prettier configurados na raiz
- [ ] 0.1.3 Git hooks (husky + lint-staged)
- [ ] 0.1.4 CI básico (GitHub Actions)
- [x] 0.1.5 `.env.example` criado para `backend` e `web` (shared não precisa)
- [ ] 0.2.x Setup do banco de dados (Postgres/Neon, Knex, migrations, seeds)
- [x] 0.3.1 Backend Node.js + TypeScript inicializado
- [x] 0.3.2 Fastify configurado (servidor básico com `/health`)
- [ ] 0.3.3 Conexão com PostgreSQL (pool de conexões)
- [ ] 0.3.4 Jest + Supertest configurados
- [ ] 0.3.5 Estrutura de pastas completa de módulos (`src/modules/...`)
- [ ] 0.3.6 Logger estruturado (pino/winston) — hoje usa só o logger padrão do Fastify
- [ ] 0.3.7 Middleware de tratamento de erros

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
