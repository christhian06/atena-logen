-- =============================================================
-- ATENA LOGEN — Schema PostgreSQL
-- =============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- CAMADA 1: HIERARQUIA GEOGRÁFICA
-- =============================================================

CREATE TABLE company (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  cnpj       VARCHAR(18)  NOT NULL UNIQUE,
  active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE plant (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID         NOT NULL REFERENCES company(id),
  name       VARCHAR(255) NOT NULL,
  city       VARCHAR(255),
  latitude   DOUBLE PRECISION,
  longitude  DOUBLE PRECISION,
  active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE sector (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id    UUID         NOT NULL REFERENCES plant(id),
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  description TEXT,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (plant_id, code)
);

-- =============================================================
-- CAMADA 2: TIPOS DE ENDEREÇO E ENDEREÇOS
-- =============================================================

CREATE TABLE address_type (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  positions_per_layer INT          NOT NULL CHECK (positions_per_layer > 0),
  num_layers          INT          NOT NULL CHECK (num_layers > 0),
  total_positions     INT          GENERATED ALWAYS AS (positions_per_layer * num_layers) STORED
);

CREATE TABLE address (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_id   UUID    NOT NULL REFERENCES sector(id),
  type_id     INT     NOT NULL REFERENCES address_type(id),
  tag_id      UUID    UNIQUE,             -- FK adicionada após tabela tag
  code        VARCHAR(50)  NOT NULL,
  description TEXT,
  occupation  INT     NOT NULL DEFAULT 0 CHECK (occupation >= 0),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (sector_id, code)
);

-- =============================================================
-- CAMADA 3: TAGS RFID
-- =============================================================

CREATE TYPE tag_type_enum AS ENUM ('pallet', 'address');

CREATE TABLE tag (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  epc           VARCHAR(128) NOT NULL UNIQUE,
  tag_type      tag_type_enum NOT NULL,
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  registered_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- FK da tag no address (agora que tag existe)
ALTER TABLE address ADD CONSTRAINT fk_address_tag
  FOREIGN KEY (tag_id) REFERENCES tag(id);

-- =============================================================
-- CAMADA 4: PRODUTOS E TIPOS DE PALLET
-- =============================================================

CREATE TABLE product (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID         NOT NULL REFERENCES company(id),
  name        VARCHAR(255) NOT NULL,
  sku         VARCHAR(100) NOT NULL,
  description TEXT,
  weight_kg   NUMERIC(10,3),
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, sku)
);

CREATE TYPE asset_type_enum AS ENUM ('image', 'glb', 'usdz');

CREATE TABLE pallet_type (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)    NOT NULL,
  max_weight_kg NUMERIC(10,3),
  asset_url     TEXT,
  asset_type    asset_type_enum
);

-- =============================================================
-- CAMADA 5: PALLETS
-- =============================================================

CREATE TABLE pallet (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_id             UUID UNIQUE      REFERENCES tag(id),
  type_id            INT              REFERENCES pallet_type(id),
  code               VARCHAR(100) NOT NULL UNIQUE,
  description        TEXT,
  current_address_id UUID             REFERENCES address(id),
  address_position   INT              CHECK (address_position > 0),
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  last_moved_at      TIMESTAMP,
  created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),

  -- lat/long só faz sentido fora de endereço
  CONSTRAINT chk_location CHECK (
    (current_address_id IS NOT NULL AND latitude IS NULL AND longitude IS NULL)
    OR
    (current_address_id IS NULL)
  ),
  -- address_position só faz sentido com endereço
  CONSTRAINT chk_position CHECK (
    (current_address_id IS NOT NULL AND address_position IS NOT NULL)
    OR
    (current_address_id IS NULL AND address_position IS NULL)
  )
);

CREATE TABLE pallet_product (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pallet_id  UUID           NOT NULL REFERENCES pallet(id) ON DELETE CASCADE,
  product_id UUID           NOT NULL REFERENCES product(id),
  quantity   NUMERIC(10,3)  NOT NULL CHECK (quantity > 0),
  unit       VARCHAR(20)    NOT NULL,
  UNIQUE (pallet_id, product_id)
);

-- =============================================================
-- CAMADA 6: OPERADORES E EQUIPAMENTOS
-- =============================================================

CREATE TYPE user_role_enum AS ENUM ('admin', 'supervisor', 'operator');

CREATE TABLE "user" (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID         NOT NULL REFERENCES company(id),
  name          VARCHAR(255) NOT NULL,
  login         VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          user_role_enum NOT NULL DEFAULT 'operator',
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE device (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id      UUID         NOT NULL REFERENCES plant(id),
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  ble_mac       VARCHAR(17)  NOT NULL UNIQUE,
  model         VARCHAR(100),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE forklift (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id   UUID         NOT NULL REFERENCES plant(id),
  code       VARCHAR(50)  NOT NULL,
  model      VARCHAR(100),
  active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (plant_id, code)
);

-- =============================================================
-- CAMADA 7: SESSÕES
-- =============================================================

CREATE TABLE user_session (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID      NOT NULL REFERENCES "user"(id),
  device_id   UUID      NOT NULL REFERENCES device(id),
  forklift_id UUID      NOT NULL REFERENCES forklift(id),
  plant_id    UUID      NOT NULL REFERENCES plant(id),
  started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMP,

  CONSTRAINT chk_session_end CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- =============================================================
-- CAMADA 8: EVENTOS
-- =============================================================

CREATE TYPE event_layer_enum AS ENUM ('raw', 'inferred', 'reconciliation');

CREATE TABLE event_type (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  layer       event_layer_enum NOT NULL,
  icon        VARCHAR(100)
);

-- Seed dos tipos de evento
INSERT INTO event_type (code, name, description, layer, icon) VALUES
  ('FORKLIFT_ADDRESS_ENTER',  'Empilhadeira acessou endereço',   'Leitura do tag de endereço detectada',                   'raw',            'ti-map-pin'),
  ('FORKLIFT_ADDRESS_LEAVE',  'Empilhadeira saiu de endereço',   'Tag de endereço deixou de ser lido',                     'raw',            'ti-map-pin-off'),
  ('FORKLIFT_PALLET_PICK',    'Empilhadeira pegou pallet',       'Leitura do tag de pallet detectada',                     'raw',            'ti-package'),
  ('FORKLIFT_PALLET_DROP',    'Empilhadeira deixou pallet',      'Tag de pallet deixou de ser lido',                       'raw',            'ti-package-off'),
  ('PALLET_STORED',           'Pallet armazenado em endereço',   'Inferido: pallet depositado em endereço e posição',      'inferred',       'ti-circle-check'),
  ('PALLET_RETRIEVED',        'Pallet retirado de endereço',     'Inferido: pallet retirado de endereço e posição',        'inferred',       'ti-circle-minus'),
  ('OPERATION_REJECTED',      'Operação rejeitada',              'Inferido: operação inválida detectada pelo app',         'inferred',       'ti-circle-x'),
  ('EVENT_RECONCILED',        'Evento reconciliado',             'Backend corrigiu evento após sync de múltiplos devices', 'reconciliation', 'ti-refresh');

CREATE TABLE event (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID      NOT NULL REFERENCES user_session(id),
  event_type_id    INT       NOT NULL REFERENCES event_type(id),
  pallet_id        UUID               REFERENCES pallet(id),
  address_id       UUID               REFERENCES address(id),
  address_position INT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  occurred_at      TIMESTAMP NOT NULL,              -- gerado no dispositivo
  synced           BOOLEAN   NOT NULL DEFAULT FALSE,
  offline_uuid     VARCHAR(36),                     -- UUID gerado no dispositivo antes do sync
  is_inferred      BOOLEAN   NOT NULL DEFAULT FALSE,
  reconciled_by    UUID               REFERENCES event(id),
  metadata         JSONB,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW() -- gerado no backend ao receber

  -- offline_uuid garante idempotência no sync
  -- UNIQUE(offline_uuid) adicionado abaixo para permitir NULL
);

CREATE UNIQUE INDEX idx_event_offline_uuid
  ON event (offline_uuid)
  WHERE offline_uuid IS NOT NULL;

-- =============================================================
-- ÍNDICES
-- =============================================================

-- Hierarquia geográfica
CREATE INDEX idx_plant_company      ON plant(company_id);
CREATE INDEX idx_sector_plant       ON sector(plant_id);
CREATE INDEX idx_address_sector     ON address(sector_id);
CREATE INDEX idx_address_type       ON address(type_id);
CREATE INDEX idx_address_tag        ON address(tag_id);

-- Pallet
CREATE INDEX idx_pallet_tag         ON pallet(tag_id);
CREATE INDEX idx_pallet_type        ON pallet(type_id);
CREATE INDEX idx_pallet_address     ON pallet(current_address_id);
CREATE INDEX idx_pallet_product_p   ON pallet_product(pallet_id);
CREATE INDEX idx_pallet_product_pr  ON pallet_product(product_id);

-- Produto
CREATE INDEX idx_product_company    ON product(company_id);

-- Sessão
CREATE INDEX idx_session_user       ON user_session(user_id);
CREATE INDEX idx_session_device     ON user_session(device_id);
CREATE INDEX idx_session_forklift   ON user_session(forklift_id);
CREATE INDEX idx_session_plant      ON user_session(plant_id);

-- Evento (as queries mais frequentes)
CREATE INDEX idx_event_session      ON event(session_id);
CREATE INDEX idx_event_type         ON event(event_type_id);
CREATE INDEX idx_event_pallet       ON event(pallet_id);
CREATE INDEX idx_event_address      ON event(address_id);
CREATE INDEX idx_event_occurred     ON event(occurred_at DESC);
CREATE INDEX idx_event_synced       ON event(synced) WHERE synced = FALSE;
CREATE INDEX idx_event_reconciled   ON event(reconciled_by) WHERE reconciled_by IS NOT NULL;

-- Tag
CREATE INDEX idx_tag_epc            ON tag(epc);

-- =============================================================
-- VIEWS ÚTEIS
-- =============================================================

-- Estado atual de ocupação de um endereço com seus pallets
CREATE VIEW v_address_occupation AS
SELECT
  a.id            AS address_id,
  a.code          AS address_code,
  s.code          AS sector_code,
  at.name         AS address_type,
  at.total_positions,
  a.occupation    AS occupied_positions,
  at.total_positions - a.occupation AS free_positions,
  ROUND(a.occupation::NUMERIC / NULLIF(at.total_positions, 0) * 100, 1) AS occupation_pct,
  json_agg(
    json_build_object(
      'pallet_id',       p.id,
      'pallet_code',     p.code,
      'position',        p.address_position,
      'last_moved_at',   p.last_moved_at
    ) ORDER BY p.address_position
  ) FILTER (WHERE p.id IS NOT NULL) AS pallets
FROM address a
JOIN sector s        ON s.id = a.sector_id
JOIN address_type at ON at.id = a.type_id
LEFT JOIN pallet p   ON p.current_address_id = a.id
GROUP BY a.id, a.code, s.code, at.name, at.total_positions, a.occupation;

-- Localização atual de cada pallet (endereço ou coordenada GPS)
CREATE VIEW v_pallet_location AS
SELECT
  p.id              AS pallet_id,
  p.code            AS pallet_code,
  pt.name           AS pallet_type,
  CASE
    WHEN p.current_address_id IS NOT NULL THEN 'address'
    ELSE 'gps'
  END               AS location_type,
  a.code            AS address_code,
  p.address_position,
  s.code            AS sector_code,
  pl.name           AS plant_name,
  p.latitude,
  p.longitude,
  p.last_moved_at
FROM pallet p
LEFT JOIN pallet_type pt  ON pt.id = p.type_id
LEFT JOIN address a       ON a.id  = p.current_address_id
LEFT JOIN sector s        ON s.id  = a.sector_id
LEFT JOIN plant pl        ON pl.id = s.plant_id;

-- Histórico de eventos não sincronizados (fila de sync)
CREATE VIEW v_sync_queue AS
SELECT
  e.id,
  e.offline_uuid,
  e.occurred_at,
  et.code     AS event_type,
  et.layer,
  e.is_inferred,
  e.pallet_id,
  e.address_id,
  e.address_position,
  e.latitude,
  e.longitude,
  e.metadata,
  us.plant_id
FROM event e
JOIN event_type et    ON et.id = e.event_type_id
JOIN user_session us  ON us.id = e.session_id
WHERE e.synced = FALSE
ORDER BY e.occurred_at ASC;
