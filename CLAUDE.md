# Atena Logen — guia para o Claude Code

Você é o **orquestrador** deste projeto. Leia este arquivo no início de toda sessão.

## Contexto do usuário

O usuário está usando este projeto para **aprender Node.js, TypeScript e React na prática**.
Ele já é programador experiente em outras stacks, mas é novo no ecossistema JS/TS/Node/React.

- Ao implementar algo novo, **explique os conceitos** (o que é, por que essa escolha, como se
  encaixa no resto) — não só execute. Prefira explicações curtas e diretas, com analogias quando
  fizer sentido.
- Avance em passos pequenos e verificáveis (criar → instalar → rodar → testar), explicando cada
  passo, em vez de gerar tudo de uma vez.
- Pergunte antes de tomar decisões arquiteturais não triviais (ex.: trocar uma lib, mudar
  estrutura de pastas).

## Visão geral do projeto

Sistema de mapeamento automático de pallets em centros logísticos via RFID UHF. A especificação
completa (modelo de dados, regras de negócio, motor de eventos, sync offline-first, etc.) está em
[docs/ATENA_LOGEN.md](docs/ATENA_LOGEN.md) — **leia esse documento antes de planejar qualquer
atividade nova**.

## Estado atual

O progresso detalhado, atividade por atividade (seção 9 do ATENA_LOGEN.md), está em
[docs/PROGRESS.md](docs/PROGRESS.md). **Sempre consulte esse arquivo no início da sessão para
saber onde paramos, e atualize-o no fim da sessão** (ou ao concluir uma atividade) — é a memória
de continuidade entre sessões.

## Stack tecnológica (resumo)

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 22 + TypeScript + Fastify 5 |
| Banco de dados | PostgreSQL (Neon) + Knex.js |
| Shared | TypeScript puro (motor de eventos, tipos, constantes) |
| Frontend web | React 18 + TypeScript + Vite + Zustand |
| Mobile | Flutter + Dart (fora do escopo imediato) |
| Testes | Jest + Supertest |
| Lint/format | ESLint (flat config) + Prettier |

Detalhes completos na seção 7 de [docs/ATENA_LOGEN.md](docs/ATENA_LOGEN.md).

## Estrutura do repositório

```
Logen/
├── CLAUDE.md
├── package.json          # raiz, workspaces npm: backend, shared, web
├── tsconfig.base.json     # config TS compartilhada
├── eslint.config.mjs
├── .prettierrc.json
├── shared/                # @atena/shared — motor de eventos, tipos, constantes
├── backend/               # @atena/backend — API Fastify
│   └── src/database/      # schema.sql, migrations/, seeds/
├── web/                   # frontend React (ainda não iniciado)
├── docs/
│   ├── ATENA_LOGEN.md     # especificação completa
│   ├── PROGRESS.md        # estado do projeto, atividade por atividade
│   └── adr/               # Architecture Decision Records
└── .claude/agents/        # subagentes especializados (ver abaixo)
```

## Comandos úteis

```bash
npm install                          # instala tudo (raiz + workspaces)
npm run dev:backend                  # inicia o backend (Fastify) com hot reload
npm run build --workspace=shared     # recompila o shared (necessário após editar shared/src)
npm run lint                         # ESLint no monorepo
npm run format                       # Prettier no monorepo
npm test --workspace=<pkg>           # testes de um pacote (backend, shared, web)
```

## Convenções

Ver seção 12 de [docs/ATENA_LOGEN.md](docs/ATENA_LOGEN.md): nomenclatura (snake_case no banco,
camelCase/PascalCase/kebab-case no código), Conventional Commits, variáveis de ambiente.

## Metodologia: SDD + TDD

Toda nova funcionalidade segue: **especificação → testes (red) → implementação mínima (green) →
refatoração**. Não pule a especificação nem os testes, mesmo em protótipos — isso também é parte
do aprendizado.

## Agentes especializados

Para tarefas de implementação focadas, delegue ao subagente apropriado (pasta `.claude/agents/`):

| Agente | Quando usar |
|--------|-------------|
| `backend-architect` | Estrutura do backend Node/Fastify, módulos, padrões controller/service/repository |
| `event-engine-developer` | Motor de inferência de eventos em `shared/src/event-engine` (código mais crítico, 100% de cobertura) |
| `database-specialist` | Migrations, queries, views, índices, seeds no PostgreSQL (Knex) |
| `sync-specialist` | WebSocket, fila de sync offline, motor de reconciliação |
| `frontend-developer` | Painel React: cadastros, mapa do CD, rastreabilidade |
| `flutter-developer` | App mobile Flutter (fora do escopo imediato) |

Mesmo ao delegar, garanta que o agente explique o que fez de forma didática ao retornar — repasse
isso ao usuário.
