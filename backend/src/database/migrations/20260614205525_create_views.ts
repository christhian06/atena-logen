import type { Knex } from 'knex';

/**
 * Views úteis (somente leitura), criadas via knex.raw() — o schema builder
 * do Knex não tem helper para CREATE VIEW, então usamos SQL puro (idêntico
 * ao schema.sql).
 *
 *  - v_address_occupation: ocupação de cada endereço + lista de pallets na pilha.
 *  - v_pallet_location: localização atual de cada pallet (endereço ou GPS).
 *  - v_sync_queue: eventos pendentes de sincronização (synced = FALSE).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
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
    GROUP BY a.id, a.code, s.code, at.name, at.total_positions, a.occupation
  `);

  await knex.raw(`
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
    LEFT JOIN plant pl        ON pl.id = s.plant_id
  `);

  await knex.raw(`
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
    ORDER BY e.occurred_at ASC
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS v_sync_queue');
  await knex.raw('DROP VIEW IF EXISTS v_pallet_location');
  await knex.raw('DROP VIEW IF EXISTS v_address_occupation');
}
