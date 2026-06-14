import type { Knex } from 'knex';

/**
 * CAMADA 3: Tags RFID.
 *
 * `tag_type_enum` é um ENUM nativo do Postgres (`CREATE TYPE ... AS ENUM`).
 * Com `table.enu(col, values, { useNative: true, enumName: '...' })`, o Knex
 * cria o tipo nomeado automaticamente (e o remove no rollback via
 * `dropTableIfExists` + `dropType`, feito explicitamente no `down`).
 *
 * Depois de criar `tag`, adicionamos a FK que faltava em `address.tag_id`
 * (ela não pôde ser criada na migration anterior porque `tag` ainda não existia).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tag', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('epc', 128).notNullable().unique();
    table
      .enu('tag_type', ['pallet', 'address'], {
        useNative: true,
        enumName: 'tag_type_enum',
      })
      .notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('registered_at').notNullable().defaultTo(knex.fn.now());
  });

  // FK de address.tag_id -> tag.id (coluna já existia desde a migration anterior).
  await knex.schema.alterTable('address', (table) => {
    table.foreign('tag_id', 'fk_address_tag').references('id').inTable('tag');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('address', (table) => {
    table.dropForeign('tag_id', 'fk_address_tag');
  });

  await knex.schema.dropTableIfExists('tag');
  // dropTableIfExists com useNative não remove o tipo ENUM automaticamente;
  // dropTable (chamado internamente) cuida disso apenas se usarmos dropTableLike.
  // Removemos o tipo explicitamente para o down ser simétrico ao up.
  await knex.raw('DROP TYPE IF EXISTS tag_type_enum');
}
