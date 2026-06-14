import type { Knex } from 'knex';

/**
 * CAMADA 6: Operadores e equipamentos (user, device, forklift).
 *
 * `"user"` é nome reservado em SQL — o Knex já coloca aspas automaticamente
 * em identificadores, então `table('user')` gera `"user"` corretamente.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('company_id').notNullable().references('id').inTable('company');
    table.string('name', 255).notNullable();
    table.string('login', 100).notNullable().unique();
    table.text('password_hash').notNullable();
    table
      .enu('role', ['admin', 'supervisor', 'operator'], {
        useNative: true,
        enumName: 'user_role_enum',
      })
      .notNullable()
      .defaultTo('operator');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('device', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('plant_id').notNullable().references('id').inTable('plant');
    table.string('serial_number', 100).notNullable().unique();
    table.string('ble_mac', 17).notNullable().unique();
    table.string('model', 100);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('forklift', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('plant_id').notNullable().references('id').inTable('plant');
    table.string('code', 50).notNullable();
    table.string('model', 100);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['plant_id', 'code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('forklift');
  await knex.schema.dropTableIfExists('device');
  await knex.schema.dropTableIfExists('user');
  await knex.raw('DROP TYPE IF EXISTS user_role_enum');
}
