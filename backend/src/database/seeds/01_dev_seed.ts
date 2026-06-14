import type { Knex } from 'knex';

/**
 * Seed de desenvolvimento — popula o banco `atena_logen_dev` com um cenário
 * mínimo coerente: 1 empresa, 1 planta, 3 setores, 2 tipos de endereço,
 * alguns endereços, tags RFID (de endereço e de pallet), 1 tipo de pallet,
 * alguns pallets (alguns armazenados, um "solto" via GPS) e 2 produtos
 * associados via pallet_product.
 *
 * IDEMPOTÊNCIA: usamos UUIDs fixos (constantes) para todas as entidades e
 * apagamos as tabelas (`del()`) antes de inserir, na ordem inversa das
 * dependências de FK (das tabelas "filhas" para as "pai"). Assim, rodar
 * `npm run db:seed` várias vezes sempre resulta no mesmo estado, sem erros
 * de unicidade (UNIQUE/PK) nem de FK ao deletar.
 */

// IDs fixos para permitir referências cruzadas entre os blocos de seed.
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const PLANT_ID = '00000000-0000-0000-0000-000000000010';

const SECTOR_A_ID = '00000000-0000-0000-0000-000000000020';
const SECTOR_B_ID = '00000000-0000-0000-0000-000000000021';
const SECTOR_EXP_ID = '00000000-0000-0000-0000-000000000022';

// address_type usa SERIAL (int) — fixamos IDs numéricos baixos e dedicados ao seed.
const ADDRESS_TYPE_PORTA_PALLET_ID = 9001;
const ADDRESS_TYPE_BLOCADO_ID = 9002;

const ADDRESS_A1_ID = '00000000-0000-0000-0000-000000000030';
const ADDRESS_A2_ID = '00000000-0000-0000-0000-000000000031';
const ADDRESS_B1_ID = '00000000-0000-0000-0000-000000000032';

const TAG_ADDRESS_A1_ID = '00000000-0000-0000-0000-000000000040';
const TAG_ADDRESS_A2_ID = '00000000-0000-0000-0000-000000000041';
const TAG_ADDRESS_B1_ID = '00000000-0000-0000-0000-000000000042';
const TAG_PALLET_1_ID = '00000000-0000-0000-0000-000000000043';
const TAG_PALLET_2_ID = '00000000-0000-0000-0000-000000000044';

const PALLET_TYPE_PBR_ID = 9001;

const PALLET_1_ID = '00000000-0000-0000-0000-000000000050'; // armazenado em ADDRESS_A1, posição 1
const PALLET_2_ID = '00000000-0000-0000-0000-000000000051'; // armazenado em ADDRESS_A1, posição 2 (topo)
const PALLET_3_ID = '00000000-0000-0000-0000-000000000052'; // solto via GPS, sem endereço

const PRODUCT_1_ID = '00000000-0000-0000-0000-000000000060';
const PRODUCT_2_ID = '00000000-0000-0000-0000-000000000061';

export async function seed(knex: Knex): Promise<void> {
  // ----------------------------------------------------------------
  // 1. Limpeza (ordem inversa das dependências de FK)
  // ----------------------------------------------------------------
  await knex('pallet_product').del();
  await knex('product').del();
  await knex('pallet').del();
  await knex('pallet_type').where('id', PALLET_TYPE_PBR_ID).del();
  await knex('address').del();
  await knex('address_type')
    .whereIn('id', [ADDRESS_TYPE_PORTA_PALLET_ID, ADDRESS_TYPE_BLOCADO_ID])
    .del();
  await knex('tag').del();
  await knex('sector').del();
  await knex('plant').del();
  await knex('company').where('id', COMPANY_ID).del();

  // ----------------------------------------------------------------
  // 2. Hierarquia geográfica
  // ----------------------------------------------------------------
  await knex('company').insert({
    id: COMPANY_ID,
    name: 'Atena Logística S.A.',
    cnpj: '12.345.678/0001-90',
    active: true,
  });

  await knex('plant').insert({
    id: PLANT_ID,
    company_id: COMPANY_ID,
    name: 'CD Curitiba',
    city: 'Curitiba',
    latitude: -25.4284,
    longitude: -49.2733,
    active: true,
  });

  await knex('sector').insert([
    {
      id: SECTOR_A_ID,
      plant_id: PLANT_ID,
      name: 'Setor A',
      code: 'A',
      description: 'Armazenagem geral, porta-pallets',
    },
    {
      id: SECTOR_B_ID,
      plant_id: PLANT_ID,
      name: 'Câmara Fria',
      code: 'CF',
      description: 'Armazenagem refrigerada',
    },
    {
      id: SECTOR_EXP_ID,
      plant_id: PLANT_ID,
      name: 'Expedição',
      code: 'EXP',
      description: 'Área de expedição e cross-docking',
    },
  ]);

  // ----------------------------------------------------------------
  // 3. Tipos de endereço e endereços
  // ----------------------------------------------------------------
  await knex('address_type').insert([
    {
      id: ADDRESS_TYPE_PORTA_PALLET_ID,
      name: 'Porta-pallet 3 níveis',
      positions_per_layer: 1,
      num_layers: 3,
      // total_positions = 1 * 3 = 3 (coluna gerada, calculada pelo Postgres)
    },
    {
      id: ADDRESS_TYPE_BLOCADO_ID,
      name: 'Blocado 2x2',
      positions_per_layer: 4,
      num_layers: 1,
      // total_positions = 4 * 1 = 4
    },
  ]);

  await knex('address').insert([
    {
      id: ADDRESS_A1_ID,
      sector_id: SECTOR_A_ID,
      type_id: ADDRESS_TYPE_PORTA_PALLET_ID,
      code: 'A-01-01',
      description: 'Setor A, rua 01, posição 01',
      occupation: 2, // PALLET_1 e PALLET_2 estão aqui
    },
    {
      id: ADDRESS_A2_ID,
      sector_id: SECTOR_A_ID,
      type_id: ADDRESS_TYPE_PORTA_PALLET_ID,
      code: 'A-01-02',
      description: 'Setor A, rua 01, posição 02',
      occupation: 0,
    },
    {
      id: ADDRESS_B1_ID,
      sector_id: SECTOR_B_ID,
      type_id: ADDRESS_TYPE_BLOCADO_ID,
      code: 'CF-01-01',
      description: 'Câmara fria, bloco 01',
      occupation: 0,
    },
  ]);

  // ----------------------------------------------------------------
  // 4. Tags RFID (endereço e pallet)
  // ----------------------------------------------------------------
  await knex('tag').insert([
    { id: TAG_ADDRESS_A1_ID, epc: 'E2000000000000000000A001', tag_type: 'address', active: true },
    { id: TAG_ADDRESS_A2_ID, epc: 'E2000000000000000000A002', tag_type: 'address', active: true },
    { id: TAG_ADDRESS_B1_ID, epc: 'E2000000000000000000B001', tag_type: 'address', active: true },
    { id: TAG_PALLET_1_ID, epc: 'E2000000000000000000P001', tag_type: 'pallet', active: true },
    { id: TAG_PALLET_2_ID, epc: 'E2000000000000000000P002', tag_type: 'pallet', active: true },
  ]);

  // Associa as tags de endereço aos respectivos endereços (address.tag_id).
  await knex('address').where('id', ADDRESS_A1_ID).update({ tag_id: TAG_ADDRESS_A1_ID });
  await knex('address').where('id', ADDRESS_A2_ID).update({ tag_id: TAG_ADDRESS_A2_ID });
  await knex('address').where('id', ADDRESS_B1_ID).update({ tag_id: TAG_ADDRESS_B1_ID });

  // ----------------------------------------------------------------
  // 5. Tipo de pallet
  // ----------------------------------------------------------------
  await knex('pallet_type').insert({
    id: PALLET_TYPE_PBR_ID,
    name: 'PBR (1,00 x 1,20m)',
    max_weight_kg: 1500,
    asset_url: null,
    asset_type: null,
  });

  // ----------------------------------------------------------------
  // 6. Pallets
  // ----------------------------------------------------------------
  await knex('pallet').insert([
    {
      id: PALLET_1_ID,
      tag_id: TAG_PALLET_1_ID,
      type_id: PALLET_TYPE_PBR_ID,
      code: 'PAL-000001',
      description: 'Pallet 1 — base da pilha em A-01-01',
      current_address_id: ADDRESS_A1_ID,
      address_position: 1,
      last_moved_at: knex.fn.now(),
    },
    {
      id: PALLET_2_ID,
      tag_id: TAG_PALLET_2_ID,
      type_id: PALLET_TYPE_PBR_ID,
      code: 'PAL-000002',
      description: 'Pallet 2 — topo da pilha em A-01-01',
      current_address_id: ADDRESS_A1_ID,
      address_position: 2,
      last_moved_at: knex.fn.now(),
    },
    {
      id: PALLET_3_ID,
      tag_id: null,
      type_id: PALLET_TYPE_PBR_ID,
      code: 'PAL-000003',
      description: 'Pallet 3 — solto, localizado via GPS (fora de endereço)',
      current_address_id: null,
      address_position: null,
      latitude: -25.429,
      longitude: -49.274,
      last_moved_at: knex.fn.now(),
    },
  ]);

  // ----------------------------------------------------------------
  // 7. Produtos e associação produto <-> pallet
  // ----------------------------------------------------------------
  await knex('product').insert([
    {
      id: PRODUCT_1_ID,
      company_id: COMPANY_ID,
      name: 'Arroz Tipo 1 — saco 5kg',
      sku: 'ARZ-5KG',
      description: 'Arroz branco tipo 1, pacote de 5kg',
      weight_kg: 5,
      active: true,
    },
    {
      id: PRODUCT_2_ID,
      company_id: COMPANY_ID,
      name: 'Feijão Carioca — saco 1kg',
      sku: 'FEJ-1KG',
      description: 'Feijão carioca, pacote de 1kg',
      weight_kg: 1,
      active: true,
    },
  ]);

  await knex('pallet_product').insert([
    {
      pallet_id: PALLET_1_ID,
      product_id: PRODUCT_1_ID,
      quantity: 120,
      unit: 'un',
    },
    {
      pallet_id: PALLET_2_ID,
      product_id: PRODUCT_1_ID,
      quantity: 80,
      unit: 'un',
    },
    {
      pallet_id: PALLET_2_ID,
      product_id: PRODUCT_2_ID,
      quantity: 200,
      unit: 'un',
    },
    {
      pallet_id: PALLET_3_ID,
      product_id: PRODUCT_2_ID,
      quantity: 50,
      unit: 'un',
    },
  ]);
}
