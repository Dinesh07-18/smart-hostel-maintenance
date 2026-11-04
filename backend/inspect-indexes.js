const pool = require("./src/config/database");

async function inspectIndexes() {
    try {
        const [rows] = await pool.query(`
            SELECT
                TABLE_NAME,
                INDEX_NAME,
                COLUMN_NAME,
                NON_UNIQUE,
                SEQ_IN_INDEX
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
        `);

        let currentTable = "";

        for (const row of rows) {
            if (currentTable !== row.TABLE_NAME) {
                currentTable = row.TABLE_NAME;
                console.log("\n--- " + currentTable + " ---");
            }

            console.log(
                `${row.INDEX_NAME} | ${row.COLUMN_NAME} | ` +
                `Unique: ${row.NON_UNIQUE === 0 ? "YES" : "NO"} | ` +
                `Position: ${row.SEQ_IN_INDEX}`
            );
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectIndexes();
