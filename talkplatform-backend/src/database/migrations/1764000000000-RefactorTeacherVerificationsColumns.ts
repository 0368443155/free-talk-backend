import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

export class RefactorTeacherVerificationsColumns1764000000000 implements MigrationInterface {
  name = 'RefactorTeacherVerificationsColumns1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to check if column exists
    const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
      const result = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND column_name = ?
      `, [tableName, columnName]);
      return Number(result[0]?.count || 0) > 0;
    };

    // Helper function to check if table exists
    const tableExists = async (tableName: string): Promise<boolean> => {
      return await queryRunner.hasTable(tableName);
    };

    // 1. Thêm các cột mới cho identity cards (VARCHAR để lưu URL)
    // Kiểm tra từng cột trước khi thêm
    if (!(await columnExists('teacher_verifications', 'identity_card_front'))) {
      await queryRunner.query(`
        ALTER TABLE \`teacher_verifications\`
        ADD COLUMN \`identity_card_front\` VARCHAR(500) NULL COMMENT 'URL to image file in uploads/teacher-verification/image/'
      `);
    }

    if (!(await columnExists('teacher_verifications', 'identity_card_back'))) {
      await queryRunner.query(`
        ALTER TABLE \`teacher_verifications\`
        ADD COLUMN \`identity_card_back\` VARCHAR(500) NULL COMMENT 'URL to image file in uploads/teacher-verification/image/'
      `);
    }

    if (!(await columnExists('teacher_verifications', 'cv_url'))) {
      await queryRunner.query(`
        ALTER TABLE \`teacher_verifications\`
        ADD COLUMN \`cv_url\` VARCHAR(500) NULL COMMENT 'File path in uploads/teacher-verification/document/'
      `);
    }

    if (!(await columnExists('teacher_verifications', 'years_of_experience'))) {
      await queryRunner.query(`
        ALTER TABLE \`teacher_verifications\`
        ADD COLUMN \`years_of_experience\` INT NULL COMMENT 'Years of teaching experience'
      `);
    }

    if (!(await columnExists('teacher_verifications', 'previous_platforms'))) {
      await queryRunner.query(`
        ALTER TABLE \`teacher_verifications\`
        ADD COLUMN \`previous_platforms\` JSON NULL COMMENT 'Array of previous platform names'
      `);
    }

    // 2. Tạo bảng cho degree certificates
    if (!(await tableExists('teacher_verification_degree_certificates'))) {
      await queryRunner.query(`
      CREATE TABLE \`teacher_verification_degree_certificates\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`verification_id\` varchar(36) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`file_url\` VARCHAR(500) NOT NULL COMMENT 'URL to image file in uploads/teacher-verification/image/',
        \`year\` INT NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_degree_cert_verification_id\` (\`verification_id\`),
        FOREIGN KEY (\`verification_id\`) REFERENCES \`teacher_verifications\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 3. Tạo bảng cho teaching certificates
    if (!(await tableExists('teacher_verification_teaching_certificates'))) {
      await queryRunner.query(`
      CREATE TABLE \`teacher_verification_teaching_certificates\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`verification_id\` varchar(36) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`issuer\` VARCHAR(255) NOT NULL,
        \`file_url\` VARCHAR(500) NOT NULL COMMENT 'URL to image file in uploads/teacher-verification/image/',
        \`year\` INT NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_teaching_cert_verification_id\` (\`verification_id\`),
        FOREIGN KEY (\`verification_id\`) REFERENCES \`teacher_verifications\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 4. Tạo bảng cho references
    if (!(await tableExists('teacher_verification_references'))) {
      await queryRunner.query(`
      CREATE TABLE \`teacher_verification_references\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`verification_id\` varchar(36) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`relationship\` VARCHAR(100) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_ref_verification_id\` (\`verification_id\`),
        FOREIGN KEY (\`verification_id\`) REFERENCES \`teacher_verifications\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 5. Migrate dữ liệu từ JSON sang các cột mới
    // Lấy tất cả records có documents JSON
    const verifications = await queryRunner.query(`
      SELECT id, documents, additional_info 
      FROM \`teacher_verifications\`
      WHERE documents IS NOT NULL
    `);

    for (const verification of verifications) {
      try {
        const documents = typeof verification.documents === 'string' 
          ? JSON.parse(verification.documents) 
          : verification.documents;
        const additionalInfo = typeof verification.additional_info === 'string'
          ? JSON.parse(verification.additional_info)
          : verification.additional_info;

        // Update identity cards và cv_url (chỉ update nếu cột chưa có giá trị)
        // Kiểm tra xem đã có giá trị chưa
        const existingVerification = await queryRunner.query(`
          SELECT identity_card_front, identity_card_back, cv_url, years_of_experience, previous_platforms
          FROM \`teacher_verifications\`
          WHERE id = ?
        `, [verification.id]);

        const existing = existingVerification[0];
        // Chỉ update nếu cột chưa có giá trị hoặc giá trị là NULL
        if (!existing?.identity_card_front || !existing?.identity_card_back) {
          await queryRunner.query(`
            UPDATE \`teacher_verifications\`
            SET 
              \`identity_card_front\` = COALESCE(\`identity_card_front\`, ?),
              \`identity_card_back\` = COALESCE(\`identity_card_back\`, ?),
              \`cv_url\` = COALESCE(\`cv_url\`, ?),
              \`years_of_experience\` = COALESCE(\`years_of_experience\`, ?),
              \`previous_platforms\` = COALESCE(\`previous_platforms\`, ?)
            WHERE \`id\` = ?
          `, [
            documents?.identity_card_front?.startsWith('http') ? documents.identity_card_front : null,
            documents?.identity_card_back?.startsWith('http') ? documents.identity_card_back : null,
            documents?.cv_url || null,
            additionalInfo?.years_of_experience || null,
            additionalInfo?.previous_platforms ? JSON.stringify(additionalInfo.previous_platforms) : null,
            verification.id
          ]);
        }

        // Migrate degree certificates (chỉ nếu bảng chưa có dữ liệu cho verification này)
        if (documents?.degree_certificates && Array.isArray(documents.degree_certificates)) {
          const existingCerts = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM \`teacher_verification_degree_certificates\`
            WHERE verification_id = ?
          `, [verification.id]);

          // Chỉ migrate nếu chưa có dữ liệu
          if (Number(existingCerts[0]?.count || 0) === 0) {
            for (const cert of documents.degree_certificates) {
              const certId = crypto.randomUUID();
              // Nếu là URL thì dùng, nếu là base64 thì để null (sẽ upload lại)
              const fileUrl = cert.data?.startsWith('http') || cert.key?.startsWith('http')
                ? (cert.data || cert.key)
                : (cert.key || null); // Nếu có key (URL) thì dùng
              
              await queryRunner.query(`
                INSERT INTO \`teacher_verification_degree_certificates\`
                (\`id\`, \`verification_id\`, \`name\`, \`file_url\`, \`year\`)
                VALUES (?, ?, ?, ?, ?)
              `, [
                certId,
                verification.id,
                cert.name || 'Unknown',
                fileUrl || '',
                cert.year || new Date().getFullYear()
              ]);
            }
          }
        }

        // Migrate teaching certificates (chỉ nếu bảng chưa có dữ liệu cho verification này)
        if (documents?.teaching_certificates && Array.isArray(documents.teaching_certificates)) {
          const existingCerts = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM \`teacher_verification_teaching_certificates\`
            WHERE verification_id = ?
          `, [verification.id]);

          // Chỉ migrate nếu chưa có dữ liệu
          if (Number(existingCerts[0]?.count || 0) === 0) {
            for (const cert of documents.teaching_certificates) {
              const certId = crypto.randomUUID();
              // Nếu là URL thì dùng, nếu là base64 thì để null (sẽ upload lại)
              const fileUrl = cert.data?.startsWith('http') || cert.key?.startsWith('http')
                ? (cert.data || cert.key)
                : (cert.key || null); // Nếu có key (URL) thì dùng
              
              await queryRunner.query(`
                INSERT INTO \`teacher_verification_teaching_certificates\`
                (\`id\`, \`verification_id\`, \`name\`, \`issuer\`, \`file_url\`, \`year\`)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [
                certId,
                verification.id,
                cert.name || 'Unknown',
                cert.issuer || 'Unknown',
                fileUrl || '',
                cert.year || new Date().getFullYear()
              ]);
            }
          }
        }

        // Migrate references (chỉ nếu bảng chưa có dữ liệu cho verification này)
        if (additionalInfo?.references && Array.isArray(additionalInfo.references)) {
          const existingRefs = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM \`teacher_verification_references\`
            WHERE verification_id = ?
          `, [verification.id]);

          // Chỉ migrate nếu chưa có dữ liệu
          if (Number(existingRefs[0]?.count || 0) === 0) {
            for (const ref of additionalInfo.references) {
              const refId = crypto.randomUUID();
              await queryRunner.query(`
                INSERT INTO \`teacher_verification_references\`
                (\`id\`, \`verification_id\`, \`name\`, \`email\`, \`relationship\`)
                VALUES (?, ?, ?, ?, ?)
              `, [
                refId,
                verification.id,
                ref.name || '',
                ref.email || '',
                ref.relationship || ''
              ]);
            }
          }
        }
      } catch (error) {
        console.error(`Error migrating verification ${verification.id}:`, error);
        // Continue with next record
      }
    }

    console.log('✅ Migration completed: Data migrated from JSON to separate columns');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new tables
    await queryRunner.query(`DROP TABLE IF EXISTS \`teacher_verification_references\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`teacher_verification_teaching_certificates\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`teacher_verification_degree_certificates\``);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE \`teacher_verifications\`
      DROP COLUMN \`previous_platforms\`,
      DROP COLUMN \`years_of_experience\`,
      DROP COLUMN \`cv_url\`,
      DROP COLUMN \`identity_card_back\`,
      DROP COLUMN \`identity_card_front\`
    `);
  }
}

