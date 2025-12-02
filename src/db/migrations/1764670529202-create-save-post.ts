import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSavePost1764670529202 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'save_posts',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int' },
          { name: 'postId', type: 'int' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          { columnNames: ['userId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['postId'], referencedTableName: 'blogs', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
      true,
    );

    // 🔥 Tạo unique index cho userId + postId
    await queryRunner.createIndex(
      'save_posts',
      new TableIndex({
        name: 'IDX_unique_user_post',
        columnNames: ['userId', 'postId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('save_posts', 'IDX_unique_user_post');
    await queryRunner.dropTable('save_posts');
  }
}
