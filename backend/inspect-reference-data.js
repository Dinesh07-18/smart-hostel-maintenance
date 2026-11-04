const pool = require("./src/config/database");

async function inspectReferenceData() {
    const queries = [
        ["ROLES", `
            SELECT role_id, role_name, description
            FROM roles
            ORDER BY role_id
        `],
        ["COMPLAINT CATEGORIES", `
            SELECT category_id, category_name, description, is_active
            FROM complaint_categories
            ORDER BY category_id
        `],
        ["PRIORITY POLICIES", `
            SELECT *
            FROM priority_policies
            ORDER BY policy_id
        `],
        ["PRIORITY POLICY FACTORS", `
            SELECT
                f.factor_id,
                p.policy_name,
                p.version,
                p.is_active,
                f.factor_name,
                f.factor_weight,
                f.description
            FROM priority_policy_factors f
            JOIN priority_policies p
                ON p.policy_id = f.policy_id
            ORDER BY p.policy_id, f.factor_id
        `]
    ];

    try {
        for (const [title, sql] of queries) {
            const [rows] = await pool.query(sql);
            console.log("\n========== " + title + " ==========");
            console.table(rows);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectReferenceData();
