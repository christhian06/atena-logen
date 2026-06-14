# Atena Logen

Sistema de mapeamento automático de pallets em centros logísticos via RFID UHF.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Arquitetura do sistema](#2-arquitetura-do-sistema)
3. [Modelo de dados](#3-modelo-de-dados)
4. [Lógica de negócio central](#4-lógica-de-negócio-central)
5. [Estratégia offline-first e sincronização](#5-estratégia-offline-first-e-sincronização)
6. [Catálogo de eventos](#6-catálogo-de-eventos)
7. [Stack tecnológica](#7-stack-tecnológica)
8. [Metodologia de desenvolvimento](#8-metodologia-de-desenvolvimento)
9. [Planejamento de atividades](#9-planejamento-de-atividades)
10. [Estrutura do repositório](#10-estrutura-do-repositório)
11. [Agentes Claude Code](#11-agentes-claude-code)
12. [Convenções e padrões](#12-convenções-e-padrões)

---

## 1. Visão geral

### O problema

Centros logísticos perdem tempo e incorrem em erros operacionais por não saberem exatamente onde cada pallet está armazenado. O mapeamento manual é lento, propenso a falhas e não reflete o estado em tempo real do estoque.

### A solução

O Atena Logen utiliza leitores RFID UHF fixados no garfo de empilhadeiras para capturar automaticamente a leitura de tags afixadas nos pallets e nos endereços de armazenagem. O sistema infere automaticamente quando um pallet é retirado ou depositado em um endereço, mantendo um mapa em tempo real do centro logístico.

### Fluxo básico de operação

```
[Empilhadeira se aproxima de um pallet]
        ↓
[Leitor RFID lê o tag do pallet]
        ↓
[Sinal BLE transmitido ao smartphone do operador]
        ↓
[Empilhadeira se dirige a um endereço]
        ↓
[Leitor RFID lê o tag do endereço]
        ↓
[Tag do pallet some da leitura ao ser depositado]
        ↓
[App infere: PALLET_STORED em endereço X posição Y]
        ↓
[Evento sincronizado com o backend]
        ↓
[Interface atualiza o mapa do CD em tempo real]
```

---

## 2. Arquitetura do sistema

### Camadas

```
┌─────────────────────────────────────────────────┐
│                HARDWARE                         │
│  Leitor RFID UHF (garfo)  ·  Tags UHF passivos  │
│         pallets            ·       endereços    │
└─────────────────┬───────────────────────────────┘
                  │ BLE
┌─────────────────▼───────────────────────────────┐
│            APP MOBILE (operador)                │
│  BLE Manager · Motor de eventos · SQLite local  │
│  Inferência de eventos · Fila de sync           │
└─────────────────┬───────────────────────────────┘
                  │ HTTPS / WebSocket
┌─────────────────▼───────────────────────────────┐
│           BACKEND  Node.js (VM)                 │
│  API REST · Event processor · Sync endpoint     │
│  Motor de reconciliação                         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              PostgreSQL                         │
│  Hierarquia geográfica · Inventário             │
│  Operação · Log de eventos                      │
└─────────────────────────────────────────────────┘
```

### Princípios arquiteturais

**Offline-first** — o app funciona sem conexão. Todos os eventos são processados e armazenados localmente primeiro. A sincronização com o backend é contínua quando há conectividade e em lote quando a conexão é restabelecida.

**Fonte única de verdade dos eventos** — a inferência de eventos de negócio (`PALLET_STORED`, `PALLET_RETRIEVED`) ocorre exclusivamente no dispositivo, que tem o contexto completo e em tempo real das leituras RFID. O backend persiste e reconcilia, mas não reinfera.

**Reconciliação por timestamp** — conflitos gerados por múltiplos operadores offline são resolvidos pelo backend com base no `occurred_at` dos eventos, preservando sempre o evento original e registrando a correção em um evento de reconciliação.

**Sync contínuo com fallback local** — o app mantém conexão persistente via WebSocket. Ao perder conectividade, entra em modo offline transparentemente. Ao reconectar, drena a fila em ordem cronológica.

---

## 3. Modelo de dados

### Diagrama de entidades (resumo)

```
COMPANY → PLANT → SECTOR → ADDRESS ← ADDRESS_TYPE
                              ↑
                             TAG
                              ↓
                           PALLET ← PALLET_TYPE
                              ↓
                        PALLET_PRODUCT → PRODUCT

USER → USER_SESSION ← DEVICE
            ↓        ← FORKLIFT
          EVENT ← EVENT_TYPE
```

### Entidades

#### Hierarquia geográfica

**COMPANY** — empresa cliente. Âncora de todos os dados multi-tenant.

**PLANT** — planta ou unidade da empresa. Contém `latitude` e `longitude` para exibição no Google Maps. A sincronização do app é sempre escopada a uma plant.

**SECTOR** — setor dentro da planta (substitui warehouse + sector da versão anterior). Agrupa endereços logicamente (ex: Setor A, Câmara Fria, Expedição).

**ADDRESS_TYPE** — tipo de endereço que define a configuração de armazenagem:
- `positions_per_layer` — posições por camada
- `num_layers` — número de camadas
- `total_positions` — calculado automaticamente (`positions_per_layer × num_layers`)

**ADDRESS** — posição física de armazenagem no CD:
- `occupation` — número de posições atualmente ocupadas (int, começa em 0)
- `tag_id` — tag RFID afixada naquele endereço
- A ocupação funciona como **pilha**: não é possível retirar um pallet de uma posição inferior sem antes retirar os de cima

#### Tags RFID

**TAG** — representa um tag RFID UHF físico:
- `epc` — código único do tag (Electronic Product Code)
- `tag_type` — enum: `'pallet'` ou `'address'`
- Um tag pode estar associado a um PALLET ou a um ADDRESS, nunca aos dois

#### Inventário

**PALLET_TYPE** — tipo de pallet com:
- `max_weight_kg` — peso máximo suportado (base para calcular empilhamento)
- `asset_url` / `asset_type` — referência a imagem ou modelo 3D (`image`, `glb`, `usdz`) para renderização na interface

**PALLET** — unidade de carga rastreada:
- `current_address_id` — endereço atual (null se fora de endereço)
- `address_position` — posição dentro da pilha do endereço (null se fora de endereço)
- `latitude` / `longitude` — coordenadas GPS usadas **somente** quando o pallet está fora de um endereço cadastrado (GPS indoor tem baixa precisão em galpões)
- Constraints de banco garantem que `lat/long` e `address_position` são mutuamente exclusivos com `current_address_id`

**PALLET_PRODUCT** — tabela de junção que representa os produtos carregados em um pallet:
- Permite que um mesmo pallet carregue múltiplos produtos com quantidades distintas
- Habilita queries como "onde está o SKU X?" ou "quais pallets contêm o produto Y?"

**PRODUCT** — produto cadastrado na empresa:
- `sku` — código único por empresa
- `weight_kg` — peso unitário (usado em cálculos de carga)

#### Operação

**USER** — usuário do sistema com roles: `admin`, `supervisor`, `operator`.

**DEVICE** — dispositivo móvel registrado, identificado pelo `ble_mac` do leitor RFID que se conecta a ele.

**FORKLIFT** — empilhadeira registrada na planta.

**USER_SESSION** — sessão de trabalho que vincula operador + dispositivo + empilhadeira + planta. Todos os eventos gerados durante a sessão herdam esse contexto. O operador seleciona a empilhadeira ao iniciar a sessão.

#### Eventos

**EVENT_TYPE** — catálogo de tipos de evento com `layer` indicando a origem:
- `raw` — gerado diretamente pelo hardware/app a partir de leituras RFID
- `inferred` — gerado pelo app a partir da correlação de eventos brutos
- `reconciliation` — gerado pelo backend ao corrigir conflitos de sync

**EVENT** — log imutável de tudo que acontece no CD:
- `occurred_at` — timestamp do dispositivo (quando aconteceu de fato)
- `created_at` — timestamp do backend (quando foi recebido)
- `offline_uuid` — UUID gerado no dispositivo para garantir idempotência no sync
- `is_inferred` — flag que separa eventos brutos de inferidos sem join
- `reconciled_by` — auto-referência ao evento de reconciliação que corrigiu este registro
- `metadata` — campo JSONB para dados extras variáveis por tipo de evento (ex: RSSI da leitura, motivo de rejeição)

---

## 4. Lógica de negócio central

### Inferência de eventos no app

O motor de eventos do app monitora continuamente a sequência de leituras BLE e aplica as seguintes regras:

**Detecção de pick (FORKLIFT_PALLET_PICK)**
- Condição: tag de pallet aparece na leitura e permanece por mais de N ms
- Ação: registra evento bruto com `pallet_id`

**Detecção de acesso a endereço (FORKLIFT_ADDRESS_ENTER)**
- Condição: tag de address aparece na leitura
- Ação: registra evento bruto com `address_id`

**Inferência de depósito (PALLET_STORED)**
- Condição: dentro da mesma sessão, sequência `FORKLIFT_PALLET_PICK` → `FORKLIFT_ADDRESS_ENTER` → tag do pallet some da leitura
- Ação:
  1. Registra evento bruto `FORKLIFT_PALLET_DROP`
  2. Infere `PALLET_STORED` com `address_id` do último `ADDRESS_ENTER` e `address_position = occupation + 1`
  3. Atualiza `PALLET.current_address_id`, `PALLET.address_position` e `ADDRESS.occupation` no SQLite local
  4. Exibe confirmação ao operador

**Inferência de retirada (PALLET_RETRIEVED)**
- Condição: dentro da mesma sessão, sequência `FORKLIFT_ADDRESS_ENTER` → `FORKLIFT_PALLET_PICK` → `FORKLIFT_ADDRESS_LEAVE`
- Ação:
  1. Registra evento bruto `FORKLIFT_ADDRESS_LEAVE`
  2. Infere `PALLET_RETRIEVED` com pallet e endereço correspondentes
  3. Atualiza estado local
  4. Exibe confirmação ao operador

**Depósito fora de endereço**
- Condição: tag do pallet some da leitura sem `ADDRESS_ENTER` precedente na sequência
- Ação: infere `PALLET_STORED` com `address_id = null` e `lat/long` do GPS do smartphone

**Rejeição de operação (OPERATION_REJECTED)**
- Condição: operador tenta retirar pallet cuja `address_position < occupation` do endereço (pallet não está no topo da pilha)
- Ação: registra `OPERATION_REJECTED` com `metadata: { reason: 'pallet_not_on_top' }` e alerta o operador

### Lógica de pilha nos endereços

Os pallets em um endereço formam uma pilha estrita:
- Entrada: sempre na posição `occupation + 1`
- Saída: somente da posição `occupation` (topo)
- Não é possível remover um pallet de posição inferior sem primeiro remover os de cima
- O backend valida essa constraint ao processar eventos sincronizados

### Reconciliação pelo backend

Ao receber um lote de eventos sincronizados, o backend:

1. Ordena todos os eventos pelo `occurred_at`
2. Reconstrói a sequência de estados do endereço
3. Detecta conflitos (dois eventos com o mesmo endereço/posição em timestamps próximos)
4. Para cada conflito, determina o estado correto pela ordem cronológica
5. Para eventos que precisam de correção, gera um `EVENT_RECONCILED` apontando para o evento original via `reconciled_by`
6. Atualiza `PALLET.current_address_id`, `PALLET.address_position` e `ADDRESS.occupation` no PostgreSQL

**O evento original nunca é alterado.** A correção existe apenas no evento de reconciliação, preservando o histórico fiel do que cada operador viu na tela.

---

## 5. Estratégia offline-first e sincronização

### Dados sincronizados localmente no dispositivo

O SQLite do app mantém uma cópia escopada à planta do operador:

- `tag` — todos os tags da planta (para identificar leituras RFID)
- `address` — todos os endereços da planta com estado de ocupação
- `address_type` — tipos de endereço
- `sector` — setores da planta
- `pallet` — pallets com localização atual
- `pallet_type` — tipos de pallet
- `product` — produtos cadastrados
- `event` (fila local) — eventos pendentes de sync

### Ciclo de sincronização

**Modo online (estado normal)**
- WebSocket ativo com o backend
- Eventos enviados em tempo real após geração local
- App recebe atualizações de outros operadores via WebSocket
- SQLite local atualizado imediatamente

**Transição para offline**
- App detecta perda de conexão
- Exibe indicador discreto de "operando offline"
- Continua processando com dados locais
- Eventos acumulados na fila com `synced = false`

**Reconexão**
- App detecta reconexão
- Envia ao backend o timestamp da última sincronização
- Backend devolve todos os eventos de outros operadores ocorridos nesse intervalo
- App drena sua fila local em ordem cronológica via endpoint de sync em lote
- Backend processa, reconcilia e devolve o estado corrigido
- App atualiza SQLite e interface

### Idempotência do sync

Cada evento gerado no dispositivo recebe um `offline_uuid` (UUID v4 gerado localmente) antes de qualquer tentativa de sync. O banco de dados tem um índice único nesse campo. Se o app enviar o mesmo lote duas vezes por falha de rede, o banco rejeita os duplicados silenciosamente.

---

## 6. Catálogo de eventos

| code | layer | descrição |
|------|-------|-----------|
| `FORKLIFT_ADDRESS_ENTER` | raw | Empilhadeira acessou endereço |
| `FORKLIFT_ADDRESS_LEAVE` | raw | Empilhadeira saiu de endereço |
| `FORKLIFT_PALLET_PICK` | raw | Empilhadeira pegou pallet |
| `FORKLIFT_PALLET_DROP` | raw | Empilhadeira deixou pallet |
| `PALLET_STORED` | inferred | Pallet armazenado em endereço/posição |
| `PALLET_RETRIEVED` | inferred | Pallet retirado de endereço/posição |
| `OPERATION_REJECTED` | inferred | Operação inválida detectada pelo app |
| `EVENT_RECONCILED` | reconciliation | Backend corrigiu conflito de sync |

### Exemplos de metadata por tipo

```json
// FORKLIFT_PALLET_PICK
{ "rssi": -62, "read_count": 4 }

// OPERATION_REJECTED
{ "reason": "pallet_not_on_top", "pallet_position": 1, "top_position": 3 }

// EVENT_RECONCILED
{
  "original_address_position": 10,
  "corrected_address_position": 9,
  "reason": "concurrent_retrieval",
  "conflicting_event_id": "uuid-do-evento-conflitante"
}
```

---

## 7. Stack tecnológica

### Decisões de stack

| camada | escolha | justificativa |
|--------|---------|---------------|
| Backend | Node.js + TypeScript | compartilhamento do motor de inferência com o mobile via módulo `shared` |
| Banco de dados | PostgreSQL no Neon | serverless, pooling nativo, já validado em projeto similar (GIAR) |
| App mobile | Flutter + Dart | BLE já validado no GIAR; reescreve motor de inferência em Dart usando TypeScript como especificação executável |
| Frontend web | React + TypeScript | interface reativa necessária para mapa do CD com atualizações em tempo real via WebSocket |
| Motor de eventos | TypeScript puro (shared) | uma implementação canônica consumida pelo backend; espelhada em Dart no Flutter com testes de contrato |

### Backend (Node.js)
- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify (performance superior ao Express para APIs de alta frequência de eventos)
- **Banco de dados**: PostgreSQL no Neon (serverless, pooling nativo via `@neondatabase/serverless`)
- **Query builder**: Knex.js (familiaridade com migrations e queries tipadas)
- **WebSocket**: `ws` com rooms por `plant_id`
- **Autenticação**: JWT (`jsonwebtoken`)
- **Validação de schema**: Zod
- **Testes**: Jest + Supertest
- **Armazenamento de assets**: S3-compatible (modelos 3D e imagens de `pallet_type`)

### App mobile (Flutter)
- **Framework**: Flutter 3.x + Dart
- **Banco local**: SQLite via `sqflite`
- **BLE**: `flutter_blue_plus` (já validado no GIAR)
- **GPS**: `geolocator`
- **HTTP/WebSocket**: `dio` + `web_socket_channel`
- **Gerenciamento de estado**: Riverpod
- **Motor de inferência**: reimplementação em Dart do módulo `shared/event-engine`, validada pelos mesmos cenários de teste

### Frontend web (React)
- **Framework**: React 18 + TypeScript + Vite
- **Roteamento**: React Router
- **Mapas**: Google Maps API (`@react-google-maps/api`)
- **Visualização do CD**: Canvas 2D (mapa de endereços) + suporte a modelos 3D via Three.js para `pallet_type`
- **WebSocket**: cliente nativo com reconexão automática
- **Gerenciamento de estado**: Zustand

### Módulo shared
- **Linguagem**: TypeScript puro — sem dependências de plataforma (sem Node APIs, sem browser APIs)
- **Conteúdo**: motor de inferência de eventos, tipos e interfaces compartilhados, constantes de `EVENT_TYPE`
- **Consumidores**: backend (import direto), Flutter (reimplementação em Dart com testes de contrato)

---

## 8. Metodologia de desenvolvimento

### SDD — Specification-Driven Development

Cada módulo começa com uma especificação escrita antes de qualquer código:

- **Especificação de API**: contrato de cada endpoint (método, rota, request, response, erros)
- **Especificação de evento**: condições de disparo, campos obrigatórios, metadata esperado
- **Especificação de tela**: fluxo de navegação, estados (loading, error, empty, success), ações do usuário

A especificação é o artefato de referência para o desenvolvimento e para os testes.

### TDD — Test-Driven Development

Fluxo por funcionalidade:

```
1. Escrever especificação
2. Escrever testes que falham (red)
3. Implementar o mínimo para os testes passarem (green)
4. Refatorar mantendo testes verdes (refactor)
```

**Backend**: Jest para testes unitários e de integração. Supertest para testes de API.

**Motor de eventos (app)**: lógica de inferência isolada em módulo puro (sem dependências de plataforma) com cobertura de testes unitários de 100% — é o código mais crítico do sistema.

**Cobertura mínima exigida**:
- Motor de eventos: 100%
- Lógica de reconciliação: 100%
- Endpoints de API: 80%
- Utilitários: 70%

---

## 9. Planejamento de atividades

### Fase 0 — Fundação (infraestrutura e base)

#### Atividade 0.1 — Setup do repositório
- [ ] 0.1.1 Criar monorepo (estrutura `/backend`, `/mobile`, `/web`, `/shared`)
- [ ] 0.1.2 Configurar ESLint + Prettier com regras compartilhadas
- [ ] 0.1.3 Configurar Git hooks (husky + lint-staged)
- [ ] 0.1.4 Configurar CI básico (rodar testes a cada push)
- [ ] 0.1.5 Criar `.env.example` para cada pacote

#### Atividade 0.2 — Setup do banco de dados
- [ ] 0.2.1 Provisionar PostgreSQL na VM
- [ ] 0.2.2 Criar banco de desenvolvimento e banco de teste
- [ ] 0.2.3 Executar schema SQL (`atena_logen_schema.sql`)
- [ ] 0.2.4 Criar sistema de migrations (Knex migrations ou Flyway)
- [ ] 0.2.5 Criar seeds de dados para desenvolvimento (empresa, planta, setores, endereços, tags, pallets)
- [ ] 0.2.6 Validar constraints e views com queries de teste

#### Atividade 0.3 — Setup do backend
- [ ] 0.3.1 Inicializar projeto Node.js com TypeScript
- [ ] 0.3.2 Configurar framework HTTP (Express/Fastify)
- [ ] 0.3.3 Configurar conexão com PostgreSQL (pool de conexões)
- [ ] 0.3.4 Configurar Jest + Supertest
- [ ] 0.3.5 Criar estrutura de pastas (ver seção 10)
- [ ] 0.3.6 Implementar logger estruturado (pino ou winston)
- [ ] 0.3.7 Implementar middleware de tratamento de erros

---

### Fase 1 — Autenticação e gestão de entidades

#### Atividade 1.1 — Autenticação
- [ ] 1.1.1 Especificar endpoints de auth (POST /auth/login, POST /auth/refresh, POST /auth/logout)
- [ ] 1.1.2 Escrever testes de auth (red)
- [ ] 1.1.3 Implementar hash de senha (bcrypt)
- [ ] 1.1.4 Implementar geração e validação de JWT
- [ ] 1.1.5 Implementar middleware de autenticação
- [ ] 1.1.6 Implementar middleware de autorização por role
- [ ] 1.1.7 Passar testes (green) e refatorar

#### Atividade 1.2 — CRUD de hierarquia geográfica
- [ ] 1.2.1 Especificar endpoints de company, plant, sector
- [ ] 1.2.2 Escrever testes (red)
- [ ] 1.2.3 Implementar repositories (queries SQL)
- [ ] 1.2.4 Implementar services (regras de negócio)
- [ ] 1.2.5 Implementar controllers (HTTP)
- [ ] 1.2.6 Passar testes e refatorar

#### Atividade 1.3 — CRUD de tipos e configurações
- [ ] 1.3.1 Especificar endpoints de address_type, pallet_type, product
- [ ] 1.3.2 Escrever testes (red)
- [ ] 1.3.3 Implementar repositories, services, controllers
- [ ] 1.3.4 Implementar upload de assets (pallet_type images/3D models)
- [ ] 1.3.5 Passar testes e refatorar

#### Atividade 1.4 — CRUD de endereços e tags
- [ ] 1.4.1 Especificar endpoints de address e tag
- [ ] 1.4.2 Escrever testes (red)
- [ ] 1.4.3 Implementar associação tag ↔ address e tag ↔ pallet
- [ ] 1.4.4 Validar unicidade de EPC e tipo de tag
- [ ] 1.4.5 Passar testes e refatorar

#### Atividade 1.5 — CRUD de pallets
- [ ] 1.5.1 Especificar endpoints de pallet e pallet_product
- [ ] 1.5.2 Escrever testes (red)
- [ ] 1.5.3 Implementar gestão de produtos no pallet (add/remove/update)
- [ ] 1.5.4 Implementar query de localização atual (v_pallet_location)
- [ ] 1.5.5 Passar testes e refatorar

#### Atividade 1.6 — CRUD de operação (users, devices, forklifts)
- [ ] 1.6.1 Especificar endpoints de user, device, forklift
- [ ] 1.6.2 Escrever testes (red)
- [ ] 1.6.3 Implementar repositories, services, controllers
- [ ] 1.6.4 Passar testes e refatorar

---

### Fase 2 — Motor de eventos e sessões

#### Atividade 2.1 — Gestão de sessões
- [ ] 2.1.1 Especificar endpoints de user_session (start, end, current)
- [ ] 2.1.2 Escrever testes (red)
- [ ] 2.1.3 Implementar abertura de sessão com validação de dispositivo e empilhadeira
- [ ] 2.1.4 Implementar encerramento de sessão
- [ ] 2.1.5 Passar testes e refatorar

#### Atividade 2.2 — Motor de inferência de eventos (módulo shared)
- [ ] 2.2.1 Especificar todas as regras de inferência com exemplos de sequências
- [ ] 2.2.2 Escrever testes unitários exaustivos cobrindo todos os cenários (red)
  - Sequência normal de pick → store
  - Sequência normal de enter → retrieve
  - Depósito fora de endereço (sem ADDRESS_ENTER)
  - Rejeição por pallet não estar no topo
  - Múltiplas leituras simultâneas
  - Sequências incompletas (conexão BLE cai no meio)
- [ ] 2.2.3 Implementar máquina de estados do motor de eventos
- [ ] 2.2.4 Passar testes com 100% de cobertura (green)
- [ ] 2.2.5 Refatorar e documentar

#### Atividade 2.3 — Endpoint de recebimento de eventos
- [ ] 2.3.1 Especificar endpoint de ingestão de evento único e em lote
- [ ] 2.3.2 Escrever testes (red)
- [ ] 2.3.3 Implementar validação de schema dos eventos recebidos
- [ ] 2.3.4 Implementar idempotência via offline_uuid
- [ ] 2.3.5 Implementar atualização de estado (pallet + address) em transação atômica
- [ ] 2.3.6 Passar testes e refatorar

#### Atividade 2.4 — Motor de reconciliação
- [ ] 2.4.1 Especificar todos os cenários de conflito com exemplos
- [ ] 2.4.2 Escrever testes unitários de reconciliação (red)
  - Dois operadores retiram do mesmo endereço offline
  - Dois operadores depositam no mesmo endereço offline
  - Timestamps idênticos (tie-break por session_id)
- [ ] 2.4.3 Implementar motor de reconciliação
- [ ] 2.4.4 Implementar geração de EVENT_RECONCILED
- [ ] 2.4.5 Passar testes com 100% de cobertura (green)
- [ ] 2.4.6 Refatorar e documentar

---

### Fase 3 — Sincronização em tempo real

#### Atividade 3.1 — WebSocket
- [ ] 3.1.1 Especificar protocolo de mensagens WebSocket (tipos, formato, auth)
- [ ] 3.1.2 Escrever testes de integração (red)
- [ ] 3.1.3 Implementar servidor WebSocket com autenticação JWT
- [ ] 3.1.4 Implementar rooms por plant_id (operadores da mesma planta recebem updates)
- [ ] 3.1.5 Implementar broadcast de eventos após persistência
- [ ] 3.1.6 Passar testes e refatorar

#### Atividade 3.2 — Endpoint de sync em lote
- [ ] 3.2.1 Especificar endpoint de sync (recebe array de eventos, devolve estado reconciliado)
- [ ] 3.2.2 Escrever testes (red)
- [ ] 3.2.3 Implementar processamento ordenado por occurred_at
- [ ] 3.2.4 Implementar detecção e resolução de conflitos
- [ ] 3.2.5 Implementar resposta com delta de estado (o que mudou desde o último sync)
- [ ] 3.2.6 Passar testes e refatorar

---

### Fase 4 — App mobile

#### Atividade 4.1 — Setup do app Flutter
- [ ] 4.1.1 Inicializar projeto Flutter com suporte a Android e iOS
- [ ] 4.1.2 Configurar dependências: `flutter_blue_plus`, `sqflite`, `web_socket_channel`, `geolocator`, `riverpod`, `dio`
- [ ] 4.1.3 Configurar SQLite local com schema espelhando o backend
- [ ] 4.1.4 Configurar sistema de navegação (GoRouter)
- [ ] 4.1.5 Configurar Riverpod como gerenciamento de estado

#### Atividade 4.2 — Motor de inferência em Dart
- [ ] 4.2.1 Traduzir `shared/event-engine` de TypeScript para Dart
- [ ] 4.2.2 Reescrever todos os testes do motor em Dart (`engine_test.dart`)
- [ ] 4.2.3 Garantir que os cenários de teste são idênticos aos do TypeScript (testes de contrato)
- [ ] 4.2.4 Cobertura de testes: 100% obrigatória

#### Atividade 4.3 — BLE e RFID
- [ ] 4.3.1 Especificar protocolo de comunicação BLE com o leitor RFID
- [ ] 4.3.2 Implementar scan e conexão ao leitor via `flutter_blue_plus`
- [ ] 4.3.3 Implementar recebimento contínuo de leituras EPC
- [ ] 4.3.4 Implementar lookup de tag no SQLite local (EPC → tipo + entidade)
- [ ] 4.3.5 Integrar leituras com o motor de inferência Dart

#### Atividade 4.4 — Fluxo de sessão no app
- [ ] 4.4.1 Tela de login
- [ ] 4.4.2 Tela de seleção de empilhadeira (início de sessão)
- [ ] 4.4.3 Tela principal de operação (leituras em tempo real + feedback de eventos)
- [ ] 4.4.4 Indicador de status de conectividade (online/offline/sincronizando)
- [ ] 4.4.5 Encerramento de sessão

#### Atividade 4.5 — Sincronização no app
- [ ] 4.5.1 Implementar cliente WebSocket com reconexão automática (`web_socket_channel`)
- [ ] 4.5.2 Implementar detecção de conectividade
- [ ] 4.5.3 Implementar fila de sync com drenagem ordenada
- [ ] 4.5.4 Implementar atualização do SQLite local ao receber updates do WebSocket
- [ ] 4.5.5 Testar cenários de reconexão com fila acumulada

---

### Fase 5 — Painel web administrativo

#### Atividade 5.1 — Setup do frontend
- [ ] 5.1.1 Inicializar projeto React com TypeScript
- [ ] 5.1.2 Configurar roteamento
- [ ] 5.1.3 Configurar cliente HTTP e WebSocket
- [ ] 5.1.4 Configurar gerenciamento de estado

#### Atividade 5.2 — Gestão de cadastros
- [ ] 5.2.1 Telas de CRUD: empresa, planta, setor, endereço
- [ ] 5.2.2 Telas de CRUD: tipos de endereço, tipos de pallet, produtos
- [ ] 5.2.3 Telas de CRUD: usuários, dispositivos, empilhadeiras
- [ ] 5.2.4 Tela de cadastro e associação de tags RFID

#### Atividade 5.3 — Mapa do CD
- [ ] 5.3.1 Visualização de plantas no Google Maps (por coordenada)
- [ ] 5.3.2 Visualização do CD por setor e endereço
- [ ] 5.3.3 Indicador visual de ocupação por endereço (usando v_address_occupation)
- [ ] 5.3.4 Drill-down: clique no endereço mostra pilha de pallets e produtos
- [ ] 5.3.5 Atualização em tempo real via WebSocket

#### Atividade 5.4 — Rastreabilidade
- [ ] 5.4.1 Busca de pallet por código ou SKU de produto
- [ ] 5.4.2 Localização atual do pallet (endereço ou GPS no mapa)
- [ ] 5.4.3 Histórico de movimentações de um pallet
- [ ] 5.4.4 Log de eventos por sessão de operador
- [ ] 5.4.5 Visualização de eventos reconciliados

---

### Fase 6 — Qualidade e produção

#### Atividade 6.1 — Testes de carga e integração
- [ ] 6.1.1 Simular múltiplos operadores simultâneos com sync concorrente
- [ ] 6.1.2 Testar reconciliação com cenários de conflito reais
- [ ] 6.1.3 Testar comportamento offline por períodos prolongados
- [ ] 6.1.4 Medir latência de sync e WebSocket sob carga

#### Atividade 6.2 — Deploy e monitoramento
- [ ] 6.2.1 Configurar ambiente de produção na VM
- [ ] 6.2.2 Configurar variáveis de ambiente de produção
- [ ] 6.2.3 Configurar PM2 ou similar para gestão do processo Node.js
- [ ] 6.2.4 Configurar backup automático do PostgreSQL
- [ ] 6.2.5 Configurar monitoramento de erros (Sentry ou similar)
- [ ] 6.2.6 Configurar logs centralizados

---

## 10. Estrutura do repositório

```
atena-logen/
├── shared/                         # Código compartilhado entre backend e mobile
│   ├── src/
│   │   ├── event-engine/           # Motor de inferência de eventos
│   │   │   ├── engine.ts           # Máquina de estados principal
│   │   │   ├── rules.ts            # Regras de inferência
│   │   │   ├── types.ts            # Tipos e interfaces
│   │   │   └── engine.test.ts      # Testes unitários (100% cobertura)
│   │   └── constants/
│   │       └── event-types.ts      # Enum de EVENT_TYPE codes
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/                 # Configurações (db, env, logger)
│   │   ├── database/
│   │   │   ├── migrations/         # Arquivos de migration
│   │   │   ├── seeds/              # Seeds de desenvolvimento
│   │   │   └── schema.sql          # Schema completo de referência
│   │   ├── modules/                # Módulos por domínio
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   └── auth.test.ts
│   │   │   ├── company/
│   │   │   ├── plant/
│   │   │   ├── sector/
│   │   │   ├── address/
│   │   │   ├── tag/
│   │   │   ├── pallet/
│   │   │   ├── product/
│   │   │   ├── user/
│   │   │   ├── device/
│   │   │   ├── forklift/
│   │   │   ├── session/
│   │   │   ├── event/
│   │   │   │   ├── event.controller.ts
│   │   │   │   ├── event.service.ts
│   │   │   │   ├── event.repository.ts
│   │   │   │   ├── reconciliation.ts   # Motor de reconciliação
│   │   │   │   ├── reconciliation.test.ts
│   │   │   │   └── event.test.ts
│   │   │   └── sync/
│   │   │       ├── sync.controller.ts
│   │   │       └── sync.test.ts
│   │   ├── websocket/
│   │   │   ├── ws.server.ts
│   │   │   └── ws.test.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   └── app.ts
│   ├── jest.config.ts
│   └── package.json
│
├── mobile/                         # App Flutter
│   ├── lib/
│   │   ├── database/               # SQLite local (sqflite)
│   │   │   ├── schema.dart         # Schema local (espelho do backend)
│   │   │   └── repositories/       # Queries SQLite por entidade
│   │   ├── ble/
│   │   │   ├── ble_manager.dart    # Conexão e leitura BLE (flutter_blue_plus)
│   │   │   └── rfid_processor.dart # Processa EPCs recebidos
│   │   ├── event_engine/           # Reimplementação Dart do shared/event-engine
│   │   │   ├── engine.dart         # Máquina de estados (espelha engine.ts)
│   │   │   ├── rules.dart          # Regras de inferência (espelha rules.ts)
│   │   │   └── engine_test.dart    # Mesmos cenários do TypeScript
│   │   ├── sync/
│   │   │   ├── ws_client.dart      # Cliente WebSocket (web_socket_channel)
│   │   │   ├── sync_queue.dart     # Fila de eventos pendentes
│   │   │   └── sync_manager.dart   # Orquestra sync online/offline
│   │   ├── screens/
│   │   ├── providers/              # Riverpod providers
│   │   └── components/
│   └── pubspec.yaml
│
├── web/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/               # Clientes de API
│   │   └── stores/                 # Estado global
│   └── package.json
│
├── docs/
│   ├── ATENA_LOGEN.md              # Este documento
│   ├── api-spec.md                 # Especificação da API REST
│   ├── event-spec.md               # Especificação do motor de eventos
│   └── adr/                        # Architecture Decision Records
│       └── 001-event-source-of-truth.md
│
└── package.json                    # Workspaces root
```

---

## 11. Agentes Claude Code

### Agente: backend-architect
**Escopo**: estrutura do projeto Node.js, configuração de módulos, padrões de código.
```
Você está desenvolvendo o backend do Atena Logen.
Stack: Node.js 20 + TypeScript + Fastify + PostgreSQL (Neon) + Knex + Zod.
Padrão arquitetural: módulos por domínio com controller → service → repository.
Cada módulo começa com especificação antes de qualquer código (SDD).
TDD obrigatório: testes antes da implementação (Jest + Supertest).
Arquivo de referência: docs/ATENA_LOGEN.md
Schema SQL: backend/src/database/schema.sql
```

### Agente: event-engine-developer
**Escopo**: módulo `shared/event-engine` — o código mais crítico do sistema.
```
Você está implementando o motor de inferência de eventos do Atena Logen.
Este módulo é a fonte canônica da lógica de inferência — será importado pelo
backend Node.js e reimplementado em Dart no Flutter usando os mesmos testes
como contrato.
Deve ser TypeScript puro: sem dependências de plataforma (sem Node APIs, sem browser APIs).
Cobertura de testes: 100% obrigatória.
Leia as seções "Lógica de negócio central" e "Catálogo de eventos" em
docs/ATENA_LOGEN.md antes de qualquer implementação.
```

### Agente: flutter-developer
**Escopo**: app mobile Flutter — BLE, SQLite local, motor de eventos Dart, sync.
```
Você está desenvolvendo o app mobile do Atena Logen em Flutter + Dart.
Dependências principais: flutter_blue_plus (BLE), sqflite (SQLite), 
web_socket_channel (WebSocket), geolocator (GPS), Riverpod (estado).
O módulo event_engine em Dart deve espelhar exatamente o comportamento
de shared/event-engine em TypeScript — use os mesmos cenários de teste.
O app é offline-first: toda lógica de inferência roda localmente primeiro.
Leia as seções "Estratégia offline-first" e "Lógica de negócio central"
em docs/ATENA_LOGEN.md antes de qualquer implementação.
```

### Agente: database-specialist
**Escopo**: migrations, queries, views, índices, seeds.
```
Você está trabalhando no banco de dados PostgreSQL do Atena Logen.
Banco: PostgreSQL no Neon (serverless) via @neondatabase/serverless.
Schema de referência: backend/src/database/schema.sql
Use Knex.js para migrations e query builder.
Toda nova coluna ou tabela deve ter migration correspondente.
Nunca altere o schema.sql diretamente — sempre via migration.
```

### Agente: sync-specialist
**Escopo**: WebSocket, fila de sync, motor de reconciliação.
```
Você está implementando a camada de sincronização do Atena Logen.
Backend: WebSocket com ws, rooms por plant_id.
Leia a seção "Estratégia offline-first e sincronização" em docs/ATENA_LOGEN.md.
A lógica de reconciliação tem cobertura de testes de 100% obrigatória.
O evento original nunca deve ser modificado — correções geram EVENT_RECONCILED.
Reconciliação é sempre por ordem cronológica de occurred_at.
```

### Agente: frontend-developer
**Escopo**: painel web React — cadastros, mapa do CD, rastreabilidade.
```
Você está desenvolvendo o painel administrativo do Atena Logen.
Stack: React 18 + TypeScript + Vite + Zustand + React Router.
Mapas: @react-google-maps/api (plantas por coordenada GPS).
Visualização do CD: Canvas 2D para mapa de endereços; Three.js para modelos 3D de pallet_type.
Atualizações em tempo real via WebSocket (rooms por plant_id).
Leia a seção "Planejamento de atividades — Fase 5" em docs/ATENA_LOGEN.md.
```

---

## 12. Convenções e padrões

### Nomenclatura

- **Tabelas**: snake_case singular (`pallet`, `event_type`)
- **Colunas**: snake_case (`current_address_id`, `occurred_at`)
- **Arquivos TypeScript**: kebab-case (`event-engine.ts`, `sync-manager.ts`)
- **Classes e interfaces**: PascalCase (`PalletService`, `EventType`)
- **Funções e variáveis**: camelCase (`inferEvent`, `currentAddressId`)
- **Constantes**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Rotas de API**: kebab-case plural (`/api/pallet-types`, `/api/user-sessions`)

### Commits

Seguir Conventional Commits:
```
feat(event-engine): adiciona detecção de depósito fora de endereço
fix(sync): corrige ordenação de eventos por occurred_at no lote
test(reconciliation): adiciona cenário de timestamps simultâneos
docs(api): especifica endpoint de sync em lote
```

### Variáveis de ambiente

```bash
# Backend
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/atena_logen?sslmode=require
JWT_SECRET=
JWT_EXPIRES_IN=8h
WS_PORT=3001
API_PORT=3000
STORAGE_BUCKET_URL=
NODE_ENV=development

# Mobile (Flutter — via .env ou dart-define)
API_BASE_URL=
WS_URL=

# Web (Vite)
VITE_API_BASE_URL=
VITE_WS_URL=
VITE_GOOGLE_MAPS_KEY=
```

### Architecture Decision Records (ADRs)

Decisões arquiteturais significativas devem ser documentadas em `docs/adr/` no formato:
```markdown
# ADR-XXX — Título da decisão

## Status
Aceito | Proposto | Depreciado

## Contexto
Por que essa decisão precisou ser tomada.

## Decisão
O que foi decidido.

## Consequências
O que muda, o que fica mais fácil, o que fica mais difícil.
```

ADRs já tomadas que devem ser documentadas:
- `001` — Motor de inferência de eventos roda no dispositivo como fonte única de verdade
- `002` — Eventos originais são imutáveis; correções geram EVENT_RECONCILED
- `003` — Reconciliação de conflitos por ordem cronológica de occurred_at
- `004` — lat/long no PALLET usado somente fora de endereço cadastrado
- `005` — Ocupação de endereço como pilha estrita (LIFO)
- `006` — Node.js escolhido sobre .NET 8 para permitir compartilhamento do motor de inferência via módulo TypeScript
- `007` — Flutter escolhido para mobile; motor de inferência reimplementado em Dart com testes de contrato derivados do TypeScript
- `008` — React escolhido para frontend pelo requisito de reatividade em tempo real no mapa do CD
- `009` — PostgreSQL no Neon (serverless) mantido por já estar validado em projeto similar (GIAR)
