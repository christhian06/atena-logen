import type { Knex } from 'knex';

/**
 * Índices adicionais (além dos criados implicitamente por PK/UNIQUE/FK).
 *
 * `table.index(col, indexName)` cobre os índices "simples" (B-tree em uma
 * coluna). Para os índices com particularidades — ordenação DESC
 * (`idx_event_occurred`) e índices parciais com `WHERE`
 * (`idx_event_synced`, `idx_event_reconciled`) — usamos `knex.raw()`, pois o
 * schema builder não tem helpers para essas variações.
 */
export async function up(knex: Knex): Promise<void> {
  // Hierarquia geográfica
  await knex.schema.alterTable('plant', (table) => {
    table.index('company_id', 'idx_plant_company');
  });
  await knex.schema.alterTable('sector', (table) => {
    table.index('plant_id', 'idx_sector_plant');
  });
  await knex.schema.alterTable('address', (table) => {
    table.index('sector_id', 'idx_address_sector');
    table.index('type_id', 'idx_address_type');
    table.index('tag_id', 'idx_address_tag');
  });

  // Pallet
  await knex.schema.alterTable('pallet', (table) => {
    table.index('tag_id', 'idx_pallet_tag');
    table.index('type_id', 'idx_pallet_type');
    table.index('current_address_id', 'idx_pallet_address');
  });
  await knex.schema.alterTable('pallet_product', (table) => {
    table.index('pallet_id', 'idx_pallet_product_p');
    table.index('product_id', 'idx_pallet_product_pr');
  });

  // Produto
  await knex.schema.alterTable('product', (table) => {
    table.index('company_id', 'idx_product_company');
  });

  // Sessão
  await knex.schema.alterTable('user_session', (table) => {
    table.index('user_id', 'idx_session_user');
    table.index('device_id', 'idx_session_device');
    table.index('forklift_id', 'idx_session_forklift');
    table.index('plant_id', 'idx_session_plant');
  });

  // Evento (as queries mais frequentes)
  await knex.schema.alterTable('event', (table) => {
    table.index('session_id', 'idx_event_session');
    table.index('event_type_id', 'idx_event_type');
    table.index('pallet_id', 'idx_event_pallet');
    table.index('address_id', 'idx_event_address');
  });
  await knex.raw('CREATE INDEX idx_event_occurred ON event(occurred_at DESC)');
  await knex.raw('CREATE INDEX idx_event_synced ON event(synced) WHERE synced = FALSE');
  await knex.raw(
    'CREATE INDEX idx_event_reconciled ON event(reconciled_by) WHERE reconciled_by IS NOT NULL',
  );

  // Tag
  await knex.schema.alterTable('tag', (table) => {
    table.index('epc', 'idx_tag_epc');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tag', (table) => {
    table.dropIndex('epc', 'idx_tag_epc');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_event_reconciled');
  await knex.raw('DROP INDEX IF EXISTS idx_event_synced');
  await knex.raw('DROP INDEX IF EXISTS idx_event_occurred');
  await knex.schema.alterTable('event', (table) => {
    table.dropIndex('address_id', 'idx_event_address');
    table.dropIndex('pallet_id', 'idx_event_pallet');
    table.dropIndex('event_type_id', 'idx_event_type');
    table.dropIndex('session_id', 'idx_event_session');
  });

  await knex.schema.alterTable('user_session', (table) => {
    table.dropIndex('plant_id', 'idx_session_plant');
    table.dropIndex('forklift_id', 'idx_session_forklift');
    table.dropIndex('device_id', 'idx_session_device');
    table.dropIndex('user_id', 'idx_session_user');
  });

  await knex.schema.alterTable('product', (table) => {
    table.dropIndex('company_id', 'idx_product_company');
  });

  await knex.schema.alterTable('pallet_product', (table) => {
    table.dropIndex('product_id', 'idx_pallet_product_pr');
    table.dropIndex('pallet_id', 'idx_pallet_product_p');
  });
  await knex.schema.alterTable('pallet', (table) => {
    table.dropIndex('current_address_id', 'idx_pallet_address');
    table.dropIndex('type_id', 'idx_pallet_type');
    table.dropIndex('tag_id', 'idx_pallet_tag');
  });

  await knex.schema.alterTable('address', (table) => {
    table.dropIndex('tag_id', 'idx_address_tag');
    table.dropIndex('type_id', 'idx_address_type');
    table.dropIndex('sector_id', 'idx_address_sector');
  });
  await knex.schema.alterTable('sector', (table) => {
    table.dropIndex('plant_id', 'idx_sector_plant');
  });
  await knex.schema.alterTable('plant', (table) => {
    table.dropIndex('company_id', 'idx_plant_company');
  });
}
