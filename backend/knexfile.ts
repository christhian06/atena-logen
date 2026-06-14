import 'dotenv/config';
import type { Knex } from 'knex';

const sharedConfig: Partial<Knex.Config> = {
  client: 'pg',
  migrations: {
    directory: './src/database/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/database/seeds',
    extension: 'ts',
  },
};

const config: Record<string, Knex.Config> = {
  development: {
    ...sharedConfig,
    connection: process.env.DATABASE_URL,
  },
  test: {
    ...sharedConfig,
    connection: process.env.DATABASE_URL_TEST,
  },
};

export default config;
