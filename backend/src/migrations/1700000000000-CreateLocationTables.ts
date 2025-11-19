import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLocationTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cafe_locations table
    await queryRunner.createTable(
      new Table({
        name: 'cafe_locations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cafe_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'wifi_ssid',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
          },
          {
            name: 'radius_meters',
            type: 'integer',
            default: 50,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for cafe_locations
    await queryRunner.createIndex(
      'cafe_locations',
      new TableIndex({
        name: 'IDX_CAFE_LOCATIONS_CAFE_ID',
        columnNames: ['cafe_id'],
      })
    );

    await queryRunner.createIndex(
      'cafe_locations',
      new TableIndex({
        name: 'IDX_CAFE_LOCATIONS_COORDS',
        columnNames: ['latitude', 'longitude'],
      })
    );

    // Create user_presence table
    await queryRunner.createTable(
      new Table({
        name: 'user_presence',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'cafe_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'in_cafe',
            type: 'boolean',
            default: false,
          },
          {
            name: 'last_seen_in_cafe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'current_ssid',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'last_latitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'last_longitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'validation_method',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for user_presence
    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_USER_PRESENCE_USER_ID',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_USER_PRESENCE_CAFE_ID',
        columnNames: ['cafe_id'],
      })
    );

    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_USER_PRESENCE_IN_CAFE',
        columnNames: ['in_cafe', 'last_seen_in_cafe'],
      })
    );

    // Create access_logs table
    await queryRunner.createTable(
      new Table({
        name: 'access_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'cafe_id',
            type: 'uuid',
          },
          {
            name: 'validation_method',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'access_granted',
            type: 'boolean',
          },
          {
            name: 'ssid_matched',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'distance_meters',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'suspicious',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for access_logs
    await queryRunner.createIndex(
      'access_logs',
      new TableIndex({
        name: 'IDX_ACCESS_LOGS_USER_ID',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'access_logs',
      new TableIndex({
        name: 'IDX_ACCESS_LOGS_CAFE_ID',
        columnNames: ['cafe_id'],
      })
    );

    await queryRunner.createIndex(
      'access_logs',
      new TableIndex({
        name: 'IDX_ACCESS_LOGS_SUSPICIOUS',
        columnNames: ['suspicious'],
      })
    );

    await queryRunner.createIndex(
      'access_logs',
      new TableIndex({
        name: 'IDX_ACCESS_LOGS_CREATED_AT',
        columnNames: ['created_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('access_logs');
    await queryRunner.dropTable('user_presence');
    await queryRunner.dropTable('cafe_locations');
  }
}
