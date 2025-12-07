import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateCommentLike1765030432468 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng comment_likes
    await queryRunner.createTable(
      new Table({
        name: 'comment_likes',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'commentId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // UNIQUE INDEX (userId, commentId)
    await queryRunner.createIndex(
      'comment_likes',
      new TableIndex({
        name: 'IDX_user_comment_unique',
        columnNames: ['userId', 'commentId'],
        isUnique: true,
      }),
    );

    // FK userId
    await queryRunner.createForeignKey(
      'comment_likes',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // FK commentId
    await queryRunner.createForeignKey(
      'comment_likes',
      new TableForeignKey({
        columnNames: ['commentId'],
        referencedTableName: 'comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('comment_likes');
  }
}
