import type { Knex } from 'knex';

/**
 * CAMADA 8: Eventos.
 *
 * `event_type` é o catálogo de tipos de evento, populado aqui via INSERT
 * (knex.raw) com os 8 tipos definidos no schema.sql. Migrations que populam
 * dados de catálogo (não dados de negócio) são uma prática comum — diferente
 * dos seeds, que são para dados de desenvolvimento/demo.
 *
 * `event.offline_uuid` tem um índice ÚNICO PARCIAL (`WHERE offline_uuid IS
 * NOT NULL`) — é o mecanismo de idempotência do sync (seção 5 do
 * ATENA_LOGEN.md): cada evento gerado offline tem um UUID próprio, e o banco
 * rejeita duplicados se o mesmo evento for reenviado. O índice é parcial
 * porque eventos antigos (criados direto pelo backend, sem passar por sync)
 * podem não ter offline_uuid (NULL), e múltiplos NULLs não devem colidir.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event_type', (table) => {
    table.increments('id'); // SERIAL PRIMARY KEY
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.text('description');
    table
      .enu('layer', ['raw', 'inferred', 'reconciliation'], {
        useNative: true,
        enumName: 'event_layer_enum',
      })
      .notNullable();
    table.string('icon', 100);
  });

  await knex('event_type').insert([
    {
      code: 'FORKLIFT_ADDRESS_ENTER',
      name: 'Empilhadeira acessou endereço',
      description: 'Leitura do tag de endereço detectada',
      layer: 'raw',
      icon: 'ti-map-pin',
    },
    {
      code: 'FORKLIFT_ADDRESS_LEAVE',
      name: 'Empilhadeira saiu de endereço',
      description: 'Tag de endereço deixou de ser lido',
      layer: 'raw',
      icon: 'ti-map-pin-off',
    },
    {
      code: 'FORKLIFT_PALLET_PICK',
      name: 'Empilhadeira pegou pallet',
      description: 'Leitura do tag de pallet detectada',
      layer: 'raw',
      icon: 'ti-package',
    },
    {
      code: 'FORKLIFT_PALLET_DROP',
      name: 'Empilhadeira deixou pallet',
      description: 'Tag de pallet deixou de ser lido',
      layer: 'raw',
      icon: 'ti-package-off',
    },
    {
      code: 'PALLET_STORED',
      name: 'Pallet armazenado em endereço',
      description: 'Inferido: pallet depositado em endereço e posição',
      layer: 'inferred',
      icon: 'ti-circle-check',
    },
    {
      code: 'PALLET_RETRIEVED',
      name: 'Pallet retirado de endereço',
      description: 'Inferido: pallet retirado de endereço e posição',
      layer: 'inferred',
      icon: 'ti-circle-minus',
    },
    {
      code: 'OPERATION_REJECTED',
      name: 'Operação rejeitada',
      description: 'Inferido: operação inválida detectada pelo app',
      layer: 'inferred',
      icon: 'ti-circle-x',
    },
    {
      code: 'EVENT_RECONCILED',
      name: 'Evento reconciliado',
      description: 'Backend corrigiu evento após sync de múltiplos devices',
      layer: 'reconciliation',
      icon: 'ti-refresh',
    },
  ]);

  await knex.schema.createTable('event', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('session_id').notNullable().references('id').inTable('user_session');
    table.integer('event_type_id').notNullable().references('id').inTable('event_type');
    table.uuid('pallet_id').references('id').inTable('pallet');
    table.uuid('address_id').references('id').inTable('address');
    table.integer('address_position');
    table.double('latitude');
    table.double('longitude');
    table.timestamp('occurred_at').notNullable(); // gerado no dispositivo
    table.boolean('synced').notNullable().defaultTo(false);
    table.string('offline_uuid', 36); // UUID gerado no dispositivo antes do sync
    table.boolean('is_inferred').notNullable().defaultTo(false);
    table.uuid('reconciled_by').references('id').inTable('event');
    table.jsonb('metadata');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()); // gerado no backend ao receber
  });

  // Índice único PARCIAL: garante idempotência do sync sem impedir múltiplos NULLs.
  await knex.raw(`
    CREATE UNIQUE INDEX idx_event_offline_uuid
      ON event (offline_uuid)
      WHERE offline_uuid IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_event_offline_uuid');
  await knex.schema.dropTableIfExists('event');
  await knex.schema.dropTableIfExists('event_type');
  await knex.raw('DROP TYPE IF EXISTS event_layer_enum');
}
