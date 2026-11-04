const pool = require("./src/config/database");

async function inspectColumns() {
    const tables = [
        "complaints",
        "complaint_categories",
        "complaint_assignments",
        "complaint_events",
        "complaint_priority_snapshots",
        "priority_policies",
        "priority_policy_factors",
        "users",
        "maintenance_staff_profiles",
        "student_profiles",
        "audit_logs"
    ];

    try {
        const [rows] = await pool.query(
            `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
                    COLUMN_KEY, COLUMN_DEFAULT
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME IN (?)
             ORDER BY TABLE_NAME, ORDINAL_POSITION`,
            [tables]
        );

        console.table(rows);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectColumns();
