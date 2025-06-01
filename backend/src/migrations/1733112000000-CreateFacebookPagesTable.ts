import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateFacebookPagesTable1733112000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'facebook_pages',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            comment: 'Facebook Page ID',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'picture',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'access_token',
            type: 'text',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'followers_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'is_connected',
            type: 'boolean',
            default: true,
          },
          {
            name: 'webhook_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_facebook_pages_user_id',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_facebook_pages_is_connected',
            columnNames: ['is_connected'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('facebook_pages');
  }
} 