const pool = require("./src/config/database");

async function main() {
    try {
        const tables = [
            "roles",
            "complaint_categories",
            "priority_policies",
            "priority_policy_factors",
            "users",
            "student_profiles",
            "maintenance_staff_profiles",
            "warden_assignments"
        ];

        for (const table of tables) {
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total FROM \`${table}\``
            );

            console.log(`${table}: ${rows[0].total}`);
        }

        const [roles] = await pool.query(
            "SELECT role_id, role_name FROM roles ORDER BY role_id"
        );

        console.log("\nRole records:");
        console.table(roles);

        const [categories] = await pool.query(
            "SELECT category_id, category_name, is_active FROM complaint_categories"
        );

        console.log("\nComplaint categories:");
        console.table(categories);

    } catch (error) {
        console.error("Baseline check failed:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
