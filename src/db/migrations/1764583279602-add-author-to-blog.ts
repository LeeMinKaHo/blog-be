import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddAuthorToBlog1764583279602 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1️⃣ Thêm cột authorId vào blogs
    await queryRunner.addColumn(
      'blogs',
      new TableColumn({
        name: 'authorId',
        type: 'int',
        isNullable: true, // hoặc false nếu bắt buộc phải có tác giả
      }),
    );

    // 2️⃣ Tạo foreign key blogs.authorId -> users.id
    await queryRunner.createForeignKey(
      'blogs',
      new TableForeignKey({
        columnNames: ['authorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL', // Xóa user thì blog vẫn tồn tại
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lấy foreign key hiện tại
    const table = await queryRunner.getTable('blogs');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('authorId') !== -1,
      );

      // 1️⃣ Xoá foreign key
      if (foreignKey) {
        await queryRunner.dropForeignKey('blogs', foreignKey);
      }

      // 2️⃣ Xoá cột authorId
      await queryRunner.dropColumn('blogs', 'authorId');
    }
  }
}
