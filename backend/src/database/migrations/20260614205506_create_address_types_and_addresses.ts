import type { Knex } from 'knex';

/**
 * CAMADA 2: Tipos de endereço e endereços.
 *
 * `address_type.total_positions` é uma "generated column" do Postgres
 * (GENERATED ALWAYS AS (...) STORED) — o valor é calculado e persistido pelo
 * próprio banco a cada INSERT/UPDATE. O Knex schema builder não tem helper
 * para isso, então criamos a tabela com as colunas normais e adicionamos a
 * coluna gerada via knex.raw().
 *
 * `address.tag_id` referencia `tag`, que só será criada na próxima migration.
 * Por isso aqui criamos a coluna como UUID UNIQUE simples (sem FK) — a
 * constraint de FK é adicionada depois que `tag` existir.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('address_type', (table) => {
    table.increments('id'); // SERIAL PRIMARY KEY
    table.string('name', 255).notNullable();
    table.integer('positions_per_layer').notNullable();
    table.integer('num_layers').notNullable();

    table.check('?? > 0', ['positions_per_layer'], 'chk_address_type_positions_per_layer');
    table.check('?? > 0', ['num_layers'], 'chk_address_type_num_layers');
  });

  // Coluna gerada: total_positions = positions_per_layer * num_layers, STORED.
  await knex.raw(`
    ALTER TABLE address_type
      ADD COLUMN total_positions INT GENERATED ALWAYS AS (positions_per_layer * num_layers) STORED
  `);

  await knex.schema.createTable('address', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('sector_id').notNullable().references('id').inTable('sector');
    table.integer('type_id').notNullable().references('id').inTable('address_type');
    // FK para tag adicionada na migration create_tags (tabela tag ainda não existe aqui).
    table.uuid('tag_id').unique();
    table.string('code', 50).notNullable();
    table.text('description');
    table.integer('occupation').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['sector_id', 'code']);
    table.check('?? >= 0', ['occupation'], 'chk_address_occupation_non_negative');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('address');
  await knex.schema.dropTableIfExists('address_type');
}
