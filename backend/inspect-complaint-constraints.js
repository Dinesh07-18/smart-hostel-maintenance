const pool = require("./src/config/database");

async function inspectComplaintConstraints() {
    try {
        const [rows] = await pool.query(`
            SELECT
                tc.CONSTRAINT_NAME,
                tc.CONSTRAINT_TYPE,
                kcu.COLUMN_NAME,
                kcu.REFERENCED_TABLE_NAME,
                kcu.REFERENCED_COLUMN_NAME,
                cc.CHECK_CLAUSE
            FROM information_schema.TABLE_CONSTRAINTS tc
            LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
                AND tc.TABLE_NAME = kcu.TABLE_NAME
                AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            LEFT JOIN information_schema.CHECK_CONSTRAINTS cc
                ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
                AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
            WHERE tc.TABLE_SCHEMA = DATABASE()
              AND tc.TABLE_NAME = 'complaints'
            ORDER BY tc.CONSTRAINT_TYPE,
                     tc.CONSTRAINT_NAME,
                     kcu.ORDINAL_POSITION
        `);

        console.table(rows);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectComplaintConstraints();
