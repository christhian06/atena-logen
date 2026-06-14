import type { Knex } from 'knex';

/**
 * CAMADA 7: Sessões de operação.
 *
 * Uma `user_session` vincula operador + dispositivo + empilhadeira + planta.
 * `chk_session_end` garante que, se a sessão foi encerrada, `ended_at` é
 * estritamente posterior a `started_at`.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_session', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('user');
    table.uuid('device_id').notNullable().references('id').inTable('device');
    table.uuid('forklift_id').notNullable().references('id').inTable('forklift');
    table.uuid('plant_id').notNullable().references('id').inTable('plant');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ended_at');

    table.check('?? IS NULL OR ?? > ??', ['ended_at', 'ended_at', 'started_at'], 'chk_session_end');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_session');
}
