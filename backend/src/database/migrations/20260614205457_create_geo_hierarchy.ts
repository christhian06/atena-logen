import type { Knex } from 'knex';

/**
 * CAMADA 1: Extensão uuid-ossp + hierarquia geográfica (company, plant, sector).
 *
 * `uuid-ossp` fornece a função `uuid_generate_v4()`, usada como default das PKs UUID
 * em quase todas as tabelas do sistema (em vez de gerar o UUID na aplicação).
 */
export async function up(knex: Knex): Promise<void> {
  // CREATE EXTENSION não tem helper no schema builder do Knex -> usamos SQL puro via knex.raw().
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('company', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('cnpj', 18).notNullable().unique();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('plant', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('company_id').notNullable().references('id').inTable('company');
    table.string('name', 255).notNullable();
    table.string('city', 255);
    table.double('latitude');
    table.double('longitude');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sector', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('plant_id').notNullable().references('id').inTable('plant');
    table.string('name', 255).notNullable();
    table.string('code', 50).notNullable();
    table.text('description');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['plant_id', 'code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Ordem inversa: tabelas dependentes (sector -> plant -> company) antes,
  // depois a extensão.
  await knex.schema.dropTableIfExists('sector');
  await knex.schema.dropTableIfExists('plant');
  await knex.schema.dropTableIfExists('company');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}
