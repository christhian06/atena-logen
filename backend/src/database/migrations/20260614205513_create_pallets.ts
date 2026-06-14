import type { Knex } from 'knex';

/**
 * CAMADA 5: Pallets.
 *
 * Constraints de negócio (ADR-004): `latitude`/`longitude` e
 * `current_address_id`/`address_position` são mutuamente exclusivos —
 * um pallet ou está em um endereço cadastrado (com posição na pilha) ou
 * está "solto" em coordenadas GPS, nunca os dois.
 *
 * `table.check(sql, bindings, constraintName)` permite expressar essas
 * CHECK constraints multi-coluna, que o schema builder não tem helper
 * dedicado para criar diretamente.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pallet', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tag_id').unique().references('id').inTable('tag');
    table.integer('type_id').references('id').inTable('pallet_type');
    table.string('code', 100).notNullable().unique();
    table.text('description');
    table.uuid('current_address_id').references('id').inTable('address');
    table.integer('address_position');
    table.double('latitude');
    table.double('longitude');
    table.timestamp('last_moved_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.check('?? > 0', ['address_position'], 'chk_position_positive');

    // lat/long só faz sentido fora de endereço
    table.check(
      `(
        (current_address_id IS NOT NULL AND latitude IS NULL AND longitude IS NULL)
        OR
        (current_address_id IS NULL)
      )`,
      [],
      'chk_location',
    );

    // address_position só faz sentido com endereço
    table.check(
      `(
        (current_address_id IS NOT NULL AND address_position IS NOT NULL)
        OR
        (current_address_id IS NULL AND address_position IS NULL)
      )`,
      [],
      'chk_position',
    );
  });

  await knex.schema.createTable('pallet_product', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('pallet_id').notNullable().references('id').inTable('pallet').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('product');
    table.decimal('quantity', 10, 3).notNullable();
    table.string('unit', 20).notNullable();

    table.unique(['pallet_id', 'product_id']);
    table.check('?? > 0', ['quantity'], 'chk_pallet_product_quantity_positive');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pallet_product');
  await knex.schema.dropTableIfExists('pallet');
}
