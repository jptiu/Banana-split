import { execSync } from 'child_process';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

async function refreshDB() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 5432,
  });

  await client.connect();

  console.log('Dropping all tables...');
  await client.query(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('Dropping all ENUM types...');
  await client.query(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT typname 
        FROM pg_type 
        WHERE typcategory = 'E'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('Dropping extensions...');
  await client.query(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')
      ) LOOP
        EXECUTE 'DROP EXTENSION IF EXISTS ' || quote_ident(r.extname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  await client.end();
}

function runMigrations() {
  console.log('Running migrations...');
  execSync('yarn migrate:up', { stdio: 'inherit' });
}

(async () => {
  try {
    await refreshDB();
    runMigrations();
    console.log('Database refreshed successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('Error refreshing database:', err.message || err);
    process.exit(1);
  }
})();
