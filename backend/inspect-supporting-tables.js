const pool = require("./src/config/database");

async function inspectSupportingTables() {
    const tables = [
        "roles",
        "hostels",
        "rooms",
        "staff_hostel_assignments",
        "warden_assignments",
        "maintenance_staff_profiles",
        "complaint_categories",
        "priority_policies",
        "priority_policy_factors"
    ];

    try {
        for (const table of tables) {
            const [rows] = await pool.query(`
                SELECT
                    COLUMN_NAME,
                    COLUMN_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    COLUMN_KEY,
                    EXTRA
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            `, [table]);

            console.log("\n========== " + table + " ==========");

            for (const row of rows) {
                console.log(
                    `${row.COLUMN_NAME} | ${row.COLUMN_TYPE} | ` +
                    `Nullable: ${row.IS_NULLABLE} | ` +
                    `Default: ${row.COLUMN_DEFAULT} | ` +
                    `Key: ${row.COLUMN_KEY} | ${row.EXTRA}`
                );
            }
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectSupportingTables();
