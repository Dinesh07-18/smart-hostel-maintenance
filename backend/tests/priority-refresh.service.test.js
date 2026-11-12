const test = require('node:test');
const assert = require('node:assert/strict');
const { refreshOpenComplaintPriorities } = require('../src/services/priority.service');

function createLockManager() {
    let owner = null;
    const waiters = [];

    return {
        async acquire(id) {
            if (owner === null) {
                owner = id;
                return;
            }
            await new Promise(resolve => waiters.push({ id, resolve }));
        },
        release(id) {
            if (owner !== id) return false;
            const next = waiters.shift();
            if (next) {
                owner = next.id;
                next.resolve();
            } else {
                owner = null;
            }
            return true;
        }
    };
}

function createHarness(options = {}) {
    const locks = createLockManager();
    const state = {
        begin: 0, commit: 0, rollback: 0, inserts: 0,
        released: 0, destroyed: 0, lockReleased: 0
    };
    let nextId = 1;

    const pool = {
        async getConnection() {
            const id = nextId++;
            return {
                async beginTransaction() { state.begin++; },
                async commit() { state.commit++; },
                async rollback() { state.rollback++; },
                release() { state.released++; },
                destroy() { state.destroyed++; },

                async execute(sql) {
                    const query = sql.replace(/\s+/g, ' ').trim().toLowerCase();

                    if (query.includes('get_lock')) {
                        if (options.lockAcquisitionResult !== undefined) {
                            return [[{ lock_acquired: options.lockAcquisitionResult }], []];
                        }
                        await locks.acquire(id);
                        return [[{ lock_acquired: 1 }], []];
                    }

                    if (query.includes('release_lock')) {
                        state.lockReleased++;
                        if (options.lockReleaseFails) {
                            return [[{ lock_released: 0 }], []];
                        }
                        locks.release(id);
                        return [[{ lock_released: 1 }], []];
                    }

                    if (query.includes('from priority_policies')) {
                        return [[{ policy_id: 1 }], []];
                    }

                    if (query.includes('from priority_policy_factors')) {
                        return [[
                            { factor_name: 'severity', factor_weight: 0.5 },
                            { factor_name: 'urgency', factor_weight: 0.3 },
                            { factor_name: 'waiting_time', factor_weight: 0.2 }
                        ], []];
                    }

                    if (query.includes('from complaints')) {
                        if (options.dynamicCandidates && state.inserts > 0) return [[], []];
                        return [options.candidates ?? [{
                            complaint_id: 101,
                            severity: 'HIGH',
                            urgency: 'MEDIUM',
                            hours_waiting: 30
                        }], []];
                    }

                    if (query.includes('insert into complaint_priority_snapshots')) {
                        if (options.insertFails) throw new Error('mock snapshot insert failure');
                        state.inserts++;
                        return [{ insertId: state.inserts, affectedRows: 1 }, []];
                    }

                    throw new Error(`Unexpected SQL: ${query}`);
                }
            };
        }
    };

    return { pool, state };
}

test('refresh commits snapshots and releases lock and connection', async () => {
    const { pool, state } = createHarness();
    const result = await refreshOpenComplaintPriorities(pool);

    assert.equal(result, 1);
    assert.equal(state.begin, 1);
    assert.equal(state.commit, 1);
    assert.equal(state.rollback, 0);
    assert.equal(state.inserts, 1);
    assert.equal(state.lockReleased, 1);
    assert.equal(state.released, 1);
    assert.equal(state.destroyed, 0);
});

test('refresh handles zero eligible complaints', async () => {
    const { pool, state } = createHarness({ candidates: [] });
    const result = await refreshOpenComplaintPriorities(pool);

    assert.equal(result, 0);
    assert.equal(state.commit, 1);
    assert.equal(state.inserts, 0);
    assert.equal(state.released, 1);
});

test('refresh rolls back when snapshot insertion fails', async () => {
    const { pool, state } = createHarness({ insertFails: true });

    await assert.rejects(
        refreshOpenComplaintPriorities(pool),
        /mock snapshot insert failure/
    );

    assert.equal(state.commit, 0);
    assert.equal(state.rollback, 1);
    assert.equal(state.lockReleased, 1);
    assert.equal(state.released, 1);
});

test('refresh stops when named-lock acquisition times out', async () => {
    const { pool, state } = createHarness({ lockAcquisitionResult: 0 });

    await assert.rejects(
        refreshOpenComplaintPriorities(pool),
        /Could not acquire the complaint priority refresh lock/i
    );

    assert.equal(state.begin, 0);
    assert.equal(state.commit, 0);
    assert.equal(state.lockReleased, 0);
    assert.equal(state.released, 1);
});

test('refresh destroys connection when named-lock release fails', async () => {
    const { pool, state } = createHarness({ lockReleaseFails: true });
    await refreshOpenComplaintPriorities(pool);

    assert.equal(state.lockReleased, 1);
    assert.equal(state.released, 0);
    assert.equal(state.destroyed, 1);
});

test('concurrent refreshes serialize and avoid duplicate snapshots', async () => {
    const { pool, state } = createHarness({ dynamicCandidates: true });

    const results = await Promise.all([
        refreshOpenComplaintPriorities(pool),
        refreshOpenComplaintPriorities(pool)
    ]);

    assert.deepEqual(results.sort(), [0, 1]);
    assert.equal(state.inserts, 1);
    assert.equal(state.begin, 2);
    assert.equal(state.commit, 2);
    assert.equal(state.lockReleased, 2);
    assert.equal(state.released, 2);
});
