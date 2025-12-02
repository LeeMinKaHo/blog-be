import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateBlogCategoryTag1681234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1️⃣ Tạo bảng categories
        await queryRunner.createTable(
            new Table({
                name: 'categories',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'name', type: 'varchar', length: '125', isNullable: false },
                ],
            }),
            true,
        );

        // 2️⃣ Tạo bảng tags
        await queryRunner.createTable(
            new Table({
                name: 'tags',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'name', type: 'varchar', length: '125', isNullable: false },
                ],
            }),
            true,
        );

        // 3️⃣ Tạo bảng blogs
        await queryRunner.createTable(
            new Table({
                name: 'blogs',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'uuid', type: 'char', length: '36', isUnique: true },
                    { name: 'title', type: 'varchar', length: '255', isNullable: false },
                    { name: 'content', type: 'text', isNullable: false },
                    { name: 'thumbnail', type: 'varchar', length: '2048', isNullable: true },
                    { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
                    { name: 'status', type: 'enum', enum: ['Draft', 'Pushlish', 'Delete'], default: `'Pushlish'` },
                    { name: 'descrtiption', type: 'varchar', length: '500', isNullable: true },
                    { name: 'categoryId', type: 'int', isNullable: true },
                ],
            }),
            true,
        );

        // 4️⃣ Thêm foreign key blogs -> categories
        await queryRunner.createForeignKey(
            'blogs',
            new TableForeignKey({
                columnNames: ['categoryId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'categories',
                onDelete: 'SET NULL',
            }),
        );

        // 5️⃣ Tạo bảng trung gian blogTags
        await queryRunner.createTable(
            new Table({
                name: 'blogTags',
                columns: [
                    { name: 'blogId', type: 'int', isPrimary: true },
                    { name: 'tagId', type: 'int', isPrimary: true },
                ],
            }),
            true,
        );

        // 6️⃣ Thêm foreign keys cho bảng blogTags
        await queryRunner.createForeignKey(
            'blogTags',
            new TableForeignKey({
                columnNames: ['blogId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'blogs',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'blogTags',
            new TableForeignKey({
                columnNames: ['tagId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'tags',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('blogTags', true);
        await queryRunner.dropTable('blogs', true);
        await queryRunner.dropTable('tags', true);
        await queryRunner.dropTable('categories', true);
    }
}
