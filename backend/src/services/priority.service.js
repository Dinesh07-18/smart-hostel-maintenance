
const pool = require("../config/database");

const { calculatePriority, FACTOR_WEIGHTS } = require("./priority-calculator");

const REFRESH_LOCK_NAME = "smart_hostel_priority_refresh";
const REFRESH_LOCK_TIMEOUT_SECONDS = 10;

async function getActivePolicy(executor) {
    const [policies] = await executor.execute(`
        SELECT policy_id
        FROM priority_policies
        WHERE is_active = 1
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until >= NOW())
        ORDER BY effective_from DESC, policy_id DESC
        LIMIT 1
        FOR SHARE
    `);

    if (!policies.length) {
        throw new Error("No active complaint priority policy is configured");
    }

    const policyId = policies[0].policy_id;

    const [factors] = await executor.execute(`
        SELECT factor_name, factor_weight
        FROM priority_policy_factors
        WHERE policy_id = ?
    `, [policyId]);

    const weights = Object.fromEntries(
        factors.map(row => [row.factor_name, Number(row.factor_weight)])
    );

    const valid = Object.keys(FACTOR_WEIGHTS).every(name =>
        Number.isFinite(weights[name]) &&
        Math.abs(weights[name] - FACTOR_WEIGHTS[name]) < 0.0005
    ) && factors.length === 3;

    if (!valid) {
        throw new Error(
            "Active priority policy factors do not match the documented 50/30/20 policy"
        );
    }

    return policyId;
}

async function insertPrioritySnapshot(
    executor,
    complaint,
    policyId,
    hoursWaiting = 0
) {
    const scores = calculatePriority({
        severity: complaint.severity,
        urgency: complaint.urgency,
        hoursWaiting
    });

    await executor.execute(`
        INSERT INTO complaint_priority_snapshots (
            complaint_id,
            policy_id,
            severity_score,
            urgency_score,
            waiting_time_score,
            total_priority_score,
            priority_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        complaint.complaint_id,
        policyId,
        scores.severity_score,
        scores.urgency_score,
        scores.waiting_time_score,
        scores.total_priority_score,
        scores.priority_level
    ]);

    return scores;
}

async function refreshOpenComplaintPriorities(connectionPool = pool) {
    const connection = await connectionPool.getConnection();

    let lockAcquired = false;
    let transactionStarted = false;

    try {
        const [lockRows] = await connection.execute(
            "SELECT GET_LOCK(?, ?) AS lock_acquired",
            [REFRESH_LOCK_NAME, REFRESH_LOCK_TIMEOUT_SECONDS]
        );

        if (Number(lockRows[0]?.lock_acquired) !== 1) {
            throw new Error(
                "Could not acquire the complaint priority refresh lock"
            );
        }

        lockAcquired = true;

        await connection.beginTransaction();
        transactionStarted = true;

        const policyId = await getActivePolicy(connection);

        const [complaints] = await connection.execute(`
            SELECT
                c.complaint_id,
                c.severity,
                c.urgency,
                GREATEST(
                    TIMESTAMPDIFF(SECOND, c.submitted_at, NOW()),
                    0
                ) / 3600 AS hours_waiting
            FROM complaints c
            WHERE c.status NOT IN (
                'RESOLVED',
                'CLOSED',
                'REJECTED'
            )
            AND NOT EXISTS (
                SELECT 1
                FROM complaint_priority_snapshots cps
                WHERE cps.complaint_id = c.complaint_id
                  AND cps.calculated_at >= NOW() - INTERVAL 1 HOUR
            )
            FOR UPDATE
        `);

        for (const complaint of complaints) {
            await insertPrioritySnapshot(
                connection,
                complaint,
                policyId,
                Number(complaint.hours_waiting)
            );
        }

        await connection.commit();
        transactionStarted = false;

        return complaints.length;

    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Priority refresh rollback failed:",
                    rollbackError.message
                );
            }
        }

        throw error;

    } finally {
        let connectionReusable = true;

        if (lockAcquired) {
            try {
                const [releaseRows] = await connection.execute(
                    "SELECT RELEASE_LOCK(?) AS lock_released",
                    [REFRESH_LOCK_NAME]
                );

                connectionReusable =
                    Number(releaseRows[0]?.lock_released) === 1;

                if (!connectionReusable) {
                    console.error(
                        "Priority refresh lock was not released normally; destroying connection"
                    );
                }
            } catch (releaseError) {
                connectionReusable = false;
                console.error(
                    "Priority refresh lock release failed; destroying connection:",
                    releaseError.message
                );
            }
        }

        if (connectionReusable) {
            connection.release();
        } else {
            connection.destroy();
        }
    }
}

module.exports = {
    calculatePriority,
    getActivePolicy,
    insertPrioritySnapshot,
    refreshOpenComplaintPriorities
};
