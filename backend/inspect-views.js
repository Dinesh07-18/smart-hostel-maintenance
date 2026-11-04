const pool = require("./src/config/database");

async function inspectViews() {
    try {
        const [rows] = await pool.query(`
            SELECT TABLE_NAME, VIEW_DEFINITION
            FROM information_schema.VIEWS
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);

        for (const row of rows) {
            console.log("\n--- " + row.TABLE_NAME + " ---");
            console.log(row.VIEW_DEFINITION);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectViews();
