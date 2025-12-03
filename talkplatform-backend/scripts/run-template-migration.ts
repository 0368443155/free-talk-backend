import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CreateCourseTemplates1766000000002 } from '../src/database/migrations/1766000000002-CreateCourseTemplates';

async function runMigration() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'talkplatform',
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    const migration = new CreateCourseTemplates1766000000002();
    console.log('🔄 Running migration: CreateCourseTemplates1766000000002');
    
    await migration.up(queryRunner);
    
    // Mark migration as executed
    await queryRunner.query(`
      INSERT INTO migrations (timestamp, name) 
      VALUES (1766000000002, 'CreateCourseTemplates1766000000002')
      ON DUPLICATE KEY UPDATE name = name
    `);

    await queryRunner.release();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigration();

