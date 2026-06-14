import type { Knex } from 'knex';

/**
 * CAMADA 4: Produtos e tipos de pallet.
 *
 * `asset_type_enum` é outro ENUM nativo, usado em `pallet_type.asset_type`
 * para indicar o formato do asset 3D/imagem (image, glb, usdz).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('product', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('company_id').notNullable().references('id').inTable('company');
    table.string('name', 255).notNullable();
    table.string('sku', 100).notNullable();
    table.text('description');
    table.decimal('weight_kg', 10, 3);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['company_id', 'sku']);
  });

  await knex.schema.createTable('pallet_type', (table) => {
    table.increments('id'); // SERIAL PRIMARY KEY
    table.string('name', 255).notNullable();
    table.decimal('max_weight_kg', 10, 3);
    table.text('asset_url');
    table.enu('asset_type', ['image', 'glb', 'usdz'], {
      useNative: true,
      enumName: 'asset_type_enum',
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pallet_type');
  await knex.raw('DROP TYPE IF EXISTS asset_type_enum');
  await knex.schema.dropTableIfExists('product');
}
