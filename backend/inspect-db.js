const pool = require("./src/config/database");

async function inspectTables() {
    try {
        const [rows] = await pool.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
        );

        console.table(rows);
    } catch (error) {
        console.error(error.message);
    } finally {
        await pool.end();
    }
}

inspectTables();
