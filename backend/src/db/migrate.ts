import { db } from './connection';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  try {
    console.log('Running database migrations...');

    // 1. Run main schema first
    console.log('Running main schema...');
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    await db.query(schema);
    console.log('✓ Main schema applied');

    // 2. Run migration files from migrations folder
    const migrationsDir = join(__dirname, 'migrations');

    if (existsSync(migrationsDir)) {
      const migrationFiles = readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure migrations run in order

      if (migrationFiles.length > 0) {
        console.log(`\nFound ${migrationFiles.length} migration file(s):`);

        for (const file of migrationFiles) {
          console.log(`Running migration: ${file}...`);
          const migrationPath = join(migrationsDir, file);
          const migration = readFileSync(migrationPath, 'utf-8');
          await db.query(migration);
          console.log(`✓ ${file} applied`);
        }
      }
    }

    console.log('\n✓ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
