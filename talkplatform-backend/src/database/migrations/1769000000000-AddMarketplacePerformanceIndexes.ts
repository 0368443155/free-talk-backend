import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketplacePerformanceIndexes1769000000000 implements MigrationInterface {
    name = 'AddMarketplacePerformanceIndexes1769000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Index for material purchases by teacher and date (for revenue analytics)
        const purchasesTable = await queryRunner.getTable('material_purchases');
        if (purchasesTable) {
            const hasIndex1 = purchasesTable.indices.some(
                idx => idx.name === 'idx_material_purchases_teacher_date',
            );
            if (!hasIndex1) {
                await queryRunner.query(`
                    CREATE INDEX idx_material_purchases_teacher_date 
                    ON material_purchases(material_id, purchased_at)
                `);
            }

            // Index for purchases by date (for time series queries)
            const hasIndex2 = purchasesTable.indices.some(
                idx => idx.name === 'idx_purchases_date',
            );
            if (!hasIndex2) {
                await queryRunner.query(`
                    CREATE INDEX idx_purchases_date 
                    ON material_purchases(purchased_at)
                `);
            }
        }

        // Index for materials by teacher, sales, and published status (for top materials query)
        const materialsTable = await queryRunner.getTable('materials');
        if (materialsTable) {
            const hasIndex3 = materialsTable.indices.some(
                idx => idx.name === 'idx_materials_teacher_sales',
            );
            if (!hasIndex3) {
                await queryRunner.query(`
                    CREATE INDEX idx_materials_teacher_sales 
                    ON materials(teacher_id, total_sales DESC, is_published)
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes in reverse order
        const purchasesTable = await queryRunner.getTable('material_purchases');
        if (purchasesTable) {
            const hasIndex2 = purchasesTable.indices.some(
                idx => idx.name === 'idx_purchases_date',
            );
            if (hasIndex2) {
                await queryRunner.query(`DROP INDEX idx_purchases_date ON material_purchases`);
            }

            const hasIndex1 = purchasesTable.indices.some(
                idx => idx.name === 'idx_material_purchases_teacher_date',
            );
            if (hasIndex1) {
                await queryRunner.query(`DROP INDEX idx_material_purchases_teacher_date ON material_purchases`);
            }
        }

        const materialsTable = await queryRunner.getTable('materials');
        if (materialsTable) {
            const hasIndex3 = materialsTable.indices.some(
                idx => idx.name === 'idx_materials_teacher_sales',
            );
            if (hasIndex3) {
                await queryRunner.query(`DROP INDEX idx_materials_teacher_sales ON materials`);
            }
        }
    }
}

