# Plano de atividades — Atena Logen

Checklist **vivo** de todas as fases/atividades/subtarefas do projeto. Baseado no planejamento da
seção 9 de [ATENA_LOGEN.md](ATENA_LOGEN.md), mas este arquivo é o que efetivamente atualizamos no
dia a dia.

**Como usar:**

- Marque `[x]` ao concluir uma subtarefa. Marque a atividade/fase como `[x]` só quando **todas**
  as subtarefas dela estiverem `[x]`.
- Use `🟡` ao lado do item que está **em execução agora** (deve haver no máximo um por vez, normalmente).
- Sinta-se livre para **adicionar novas subtarefas** (ex.: `0.3.8 ...`) ou **novas atividades**
  conforme o trabalho for sendo refinado — o planejamento original é um ponto de partida, não uma
  camisa de força.
- Ao concluir uma subtarefa, atualize também `docs/PROGRESS.md`: a seção "Onde paramos" e, se for
  o caso, a tabela "Status por fase" e o log de sessões. Os dois arquivos devem contar a mesma
  história — `TASKS.md` é o "o quê" (granular), `PROGRESS.md` é o "onde estamos e por quê"
  (resumo + histórico).

---

## 🟡 Em execução agora

_(nada em execução — aguardando decisão do usuário sobre o próximo passo: 0.1.3/0.1.4 ou 0.2.x)_

---

## Fase 0 — Fundação (infraestrutura e base)

### Atividade 0.1 — Setup do repositório
- [x] 0.1.1 Criar monorepo (estrutura `/backend`, `/shared`, `/web`, npm workspaces)
- [x] 0.1.2 Configurar ESLint + Prettier com regras compartilhadas
- [ ] 0.1.3 Configurar Git hooks (husky + lint-staged)
- [ ] 0.1.4 Configurar CI básico (rodar testes a cada push)
- [x] 0.1.5 Criar `.env.example` para cada pacote (backend, web; shared não precisa)

### Atividade 0.2 — Setup do banco de dados
- [ ] 0.2.1 Provisionar PostgreSQL (Neon)
- [ ] 0.2.2 Criar banco de desenvolvimento e banco de teste
- [ ] 0.2.3 Executar schema SQL (`backend/src/database/schema.sql`)
- [ ] 0.2.4 Criar sistema de migrations (Knex)
- [ ] 0.2.5 Criar seeds de dados para desenvolvimento (empresa, planta, setores, endereços, tags, pallets)
- [ ] 0.2.6 Validar constraints e views com queries de teste

### Atividade 0.3 — Setup do backend
- [x] 0.3.1 Inicializar projeto Node.js com TypeScript
- [x] 0.3.2 Configurar framework HTTP (Fastify)
- [ ] 0.3.3 Configurar conexão com PostgreSQL (pool de conexões)
- [ ] 0.3.4 Configurar Jest + Supertest
- [ ] 0.3.5 Criar estrutura de pastas completa de módulos (ver seção 10)
- [ ] 0.3.6 Implementar logger estruturado (pino ou winston)
- [ ] 0.3.7 Implementar middleware de tratamento de erros

---

## Fase 1 — Autenticação e gestão de entidades

### Atividade 1.1 — Autenticação
- [ ] 1.1.1 Especificar endpoints de auth (POST /auth/login, POST /auth/refresh, POST /auth/logout)
- [ ] 1.1.2 Escrever testes de auth (red)
- [ ] 1.1.3 Implementar hash de senha (bcrypt)
- [ ] 1.1.4 Implementar geração e validação de JWT
- [ ] 1.1.5 Implementar middleware de autenticação
- [ ] 1.1.6 Implementar middleware de autorização por role
- [ ] 1.1.7 Passar testes (green) e refatorar

### Atividade 1.2 — CRUD de hierarquia geográfica
- [ ] 1.2.1 Especificar endpoints de company, plant, sector
- [ ] 1.2.2 Escrever testes (red)
- [ ] 1.2.3 Implementar repositories (queries SQL)
- [ ] 1.2.4 Implementar services (regras de negócio)
- [ ] 1.2.5 Implementar controllers (HTTP)
- [ ] 1.2.6 Passar testes e refatorar

### Atividade 1.3 — CRUD de tipos e configurações
- [ ] 1.3.1 Especificar endpoints de address_type, pallet_type, product
- [ ] 1.3.2 Escrever testes (red)
- [ ] 1.3.3 Implementar repositories, services, controllers
- [ ] 1.3.4 Implementar upload de assets (pallet_type images/3D models)
- [ ] 1.3.5 Passar testes e refatorar

### Atividade 1.4 — CRUD de endereços e tags
- [ ] 1.4.1 Especificar endpoints de address e tag
- [ ] 1.4.2 Escrever testes (red)
- [ ] 1.4.3 Implementar associação tag ↔ address e tag ↔ pallet
- [ ] 1.4.4 Validar unicidade de EPC e tipo de tag
- [ ] 1.4.5 Passar testes e refatorar

### Atividade 1.5 — CRUD de pallets
- [ ] 1.5.1 Especificar endpoints de pallet e pallet_product
- [ ] 1.5.2 Escrever testes (red)
- [ ] 1.5.3 Implementar gestão de produtos no pallet (add/remove/update)
- [ ] 1.5.4 Implementar query de localização atual (v_pallet_location)
- [ ] 1.5.5 Passar testes e refatorar

### Atividade 1.6 — CRUD de operação (users, devices, forklifts)
- [ ] 1.6.1 Especificar endpoints de user, device, forklift
- [ ] 1.6.2 Escrever testes (red)
- [ ] 1.6.3 Implementar repositories, services, controllers
- [ ] 1.6.4 Passar testes e refatorar

---

## Fase 2 — Motor de eventos e sessões

### Atividade 2.1 — Gestão de sessões
- [ ] 2.1.1 Especificar endpoints de user_session (start, end, current)
- [ ] 2.1.2 Escrever testes (red)
- [ ] 2.1.3 Implementar abertura de sessão com validação de dispositivo e empilhadeira
- [ ] 2.1.4 Implementar encerramento de sessão
- [ ] 2.1.5 Passar testes e refatorar

### Atividade 2.2 — Motor de inferência de eventos (módulo shared)
- [ ] 2.2.1 Especificar todas as regras de inferência com exemplos de sequências
- [ ] 2.2.2 Escrever testes unitários exaustivos cobrindo todos os cenários (red)
  - [ ] Sequência normal de pick → store
  - [ ] Sequência normal de enter → retrieve
  - [ ] Depósito fora de endereço (sem ADDRESS_ENTER)
  - [ ] Rejeição por pallet não estar no topo
  - [ ] Múltiplas leituras simultâneas
  - [ ] Sequências incompletas (conexão BLE cai no meio)
- [ ] 2.2.3 Implementar máquina de estados do motor de eventos
- [ ] 2.2.4 Passar testes com 100% de cobertura (green)
- [ ] 2.2.5 Refatorar e documentar

### Atividade 2.3 — Endpoint de recebimento de eventos
- [ ] 2.3.1 Especificar endpoint de ingestão de evento único e em lote
- [ ] 2.3.2 Escrever testes (red)
- [ ] 2.3.3 Implementar validação de schema dos eventos recebidos
- [ ] 2.3.4 Implementar idempotência via offline_uuid
- [ ] 2.3.5 Implementar atualização de estado (pallet + address) em transação atômica
- [ ] 2.3.6 Passar testes e refatorar

### Atividade 2.4 — Motor de reconciliação
- [ ] 2.4.1 Especificar todos os cenários de conflito com exemplos
- [ ] 2.4.2 Escrever testes unitários de reconciliação (red)
  - [ ] Dois operadores retiram do mesmo endereço offline
  - [ ] Dois operadores depositam no mesmo endereço offline
  - [ ] Timestamps idênticos (tie-break por session_id)
- [ ] 2.4.3 Implementar motor de reconciliação
- [ ] 2.4.4 Implementar geração de EVENT_RECONCILED
- [ ] 2.4.5 Passar testes com 100% de cobertura (green)
- [ ] 2.4.6 Refatorar e documentar

---

## Fase 3 — Sincronização em tempo real

### Atividade 3.1 — WebSocket
- [ ] 3.1.1 Especificar protocolo de mensagens WebSocket (tipos, formato, auth)
- [ ] 3.1.2 Escrever testes de integração (red)
- [ ] 3.1.3 Implementar servidor WebSocket com autenticação JWT
- [ ] 3.1.4 Implementar rooms por plant_id (operadores da mesma planta recebem updates)
- [ ] 3.1.5 Implementar broadcast de eventos após persistência
- [ ] 3.1.6 Passar testes e refatorar

### Atividade 3.2 — Endpoint de sync em lote
- [ ] 3.2.1 Especificar endpoint de sync (recebe array de eventos, devolve estado reconciliado)
- [ ] 3.2.2 Escrever testes (red)
- [ ] 3.2.3 Implementar processamento ordenado por occurred_at
- [ ] 3.2.4 Implementar detecção e resolução de conflitos
- [ ] 3.2.5 Implementar resposta com delta de estado (o que mudou desde o último sync)
- [ ] 3.2.6 Passar testes e refatorar

---

## Fase 4 — App mobile

### Atividade 4.1 — Setup do app Flutter
- [ ] 4.1.1 Inicializar projeto Flutter com suporte a Android e iOS
- [ ] 4.1.2 Configurar dependências: `flutter_blue_plus`, `sqflite`, `web_socket_channel`, `geolocator`, `riverpod`, `dio`
- [ ] 4.1.3 Configurar SQLite local com schema espelhando o backend
- [ ] 4.1.4 Configurar sistema de navegação (GoRouter)
- [ ] 4.1.5 Configurar Riverpod como gerenciamento de estado

### Atividade 4.2 — Motor de inferência em Dart
- [ ] 4.2.1 Traduzir `shared/event-engine` de TypeScript para Dart
- [ ] 4.2.2 Reescrever todos os testes do motor em Dart (`engine_test.dart`)
- [ ] 4.2.3 Garantir que os cenários de teste são idênticos aos do TypeScript (testes de contrato)
- [ ] 4.2.4 Cobertura de testes: 100% obrigatória

### Atividade 4.3 — BLE e RFID
- [ ] 4.3.1 Especificar protocolo de comunicação BLE com o leitor RFID
- [ ] 4.3.2 Implementar scan e conexão ao leitor via `flutter_blue_plus`
- [ ] 4.3.3 Implementar recebimento contínuo de leituras EPC
- [ ] 4.3.4 Implementar lookup de tag no SQLite local (EPC → tipo + entidade)
- [ ] 4.3.5 Integrar leituras com o motor de inferência Dart

### Atividade 4.4 — Fluxo de sessão no app
- [ ] 4.4.1 Tela de login
- [ ] 4.4.2 Tela de seleção de empilhadeira (início de sessão)
- [ ] 4.4.3 Tela principal de operação (leituras em tempo real + feedback de eventos)
- [ ] 4.4.4 Indicador de status de conectividade (online/offline/sincronizando)
- [ ] 4.4.5 Encerramento de sessão

### Atividade 4.5 — Sincronização no app
- [ ] 4.5.1 Implementar cliente WebSocket com reconexão automática (`web_socket_channel`)
- [ ] 4.5.2 Implementar detecção de conectividade
- [ ] 4.5.3 Implementar fila de sync com drenagem ordenada
- [ ] 4.5.4 Implementar atualização do SQLite local ao receber updates do WebSocket
- [ ] 4.5.5 Testar cenários de reconexão com fila acumulada

---

## Fase 5 — Painel web administrativo

### Atividade 5.1 — Setup do frontend
- [ ] 5.1.1 Inicializar projeto React com TypeScript
- [ ] 5.1.2 Configurar roteamento
- [ ] 5.1.3 Configurar cliente HTTP e WebSocket
- [ ] 5.1.4 Configurar gerenciamento de estado

### Atividade 5.2 — Gestão de cadastros
- [ ] 5.2.1 Telas de CRUD: empresa, planta, setor, endereço
- [ ] 5.2.2 Telas de CRUD: tipos de endereço, tipos de pallet, produtos
- [ ] 5.2.3 Telas de CRUD: usuários, dispositivos, empilhadeiras
- [ ] 5.2.4 Tela de cadastro e associação de tags RFID

### Atividade 5.3 — Mapa do CD
- [ ] 5.3.1 Visualização de plantas no Google Maps (por coordenada)
- [ ] 5.3.2 Visualização do CD por setor e endereço
- [ ] 5.3.3 Indicador visual de ocupação por endereço (usando v_address_occupation)
- [ ] 5.3.4 Drill-down: clique no endereço mostra pilha de pallets e produtos
- [ ] 5.3.5 Atualização em tempo real via WebSocket

### Atividade 5.4 — Rastreabilidade
- [ ] 5.4.1 Busca de pallet por código ou SKU de produto
- [ ] 5.4.2 Localização atual do pallet (endereço ou GPS no mapa)
- [ ] 5.4.3 Histórico de movimentações de um pallet
- [ ] 5.4.4 Log de eventos por sessão de operador
- [ ] 5.4.5 Visualização de eventos reconciliados

---

## Fase 6 — Qualidade e produção

### Atividade 6.1 — Testes de carga e integração
- [ ] 6.1.1 Simular múltiplos operadores simultâneos com sync concorrente
- [ ] 6.1.2 Testar reconciliação com cenários de conflito reais
- [ ] 6.1.3 Testar comportamento offline por períodos prolongados
- [ ] 6.1.4 Medir latência de sync e WebSocket sob carga

### Atividade 6.2 — Deploy e monitoramento
- [ ] 6.2.1 Configurar ambiente de produção na VM
- [ ] 6.2.2 Configurar variáveis de ambiente de produção
- [ ] 6.2.3 Configurar PM2 ou similar para gestão do processo Node.js
- [ ] 6.2.4 Configurar backup automático do PostgreSQL
- [ ] 6.2.5 Configurar monitoramento de erros (Sentry ou similar)
- [ ] 6.2.6 Configurar logs centralizados
