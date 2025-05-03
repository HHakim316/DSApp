import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCategoryRelations1743899999999 implements MigrationInterface {
    name = 'FixCategoryRelations1743899999999'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. First make categoryId nullable in products
        await queryRunner.query(`ALTER TABLE \`products\` MODIFY \`categoryId\` INT NULL`);

        // 2. Drop parent FK constraint FIRST (before dropping its index)
        await this.dropForeignKeyIfExists(queryRunner, 'categories', 'FK_9a6f051e66982b5f0318981bcaa');

        // 3. Now safely drop the index (no longer needed for FK)
        await queryRunner.query(`DROP INDEX \`FK_9a6f051e66982b5f0318981bcaa\` ON \`categories\``);

        // 4. Drop product FK constraint if exists
        await this.dropForeignKeyIfExists(queryRunner, 'products', 'FK_ff56834e735fa78a15d0cf21926');

        // 5. Recreate parent FK with ON DELETE SET NULL
        await queryRunner.query(
            `ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_9a6f051e66982b5f0318981bcaa\` 
             FOREIGN KEY (\`parentId\`) REFERENCES \`categories\`(\`id\`) 
             ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        // 6. Recreate product FK with ON DELETE SET NULL
        await queryRunner.query(
            `ALTER TABLE \`products\` ADD CONSTRAINT \`FK_ff56834e735fa78a15d0cf21926\` 
             FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) 
             ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse order of up()
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_ff56834e735fa78a15d0cf21926\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_9a6f051e66982b5f0318981bcaa\``);
        await queryRunner.query(`CREATE INDEX \`FK_9a6f051e66982b5f0318981bcaa\` ON \`categories\` (\`parentId\`)`);
        await queryRunner.query(`ALTER TABLE \`products\` MODIFY \`categoryId\` INT NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE \`products\` ADD CONSTRAINT \`FK_ff56834e735fa78a15d0cf21926\` 
             FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) 
             ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
    }

    private async dropForeignKeyIfExists(queryRunner: QueryRunner, tableName: string, constraintName: string) {
        try {
            await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``);
        } catch (error) {
            console.log(`Constraint ${constraintName} didn't exist or couldn't be dropped: ${error.message}`);
        }
    }
}