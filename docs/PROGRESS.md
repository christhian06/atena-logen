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
