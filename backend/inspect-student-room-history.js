const pool = require("./src/config/database");

async function inspectStudentRoomHistory() {
    try {
        const [rows] = await pool.query(`
            SELECT
                COLUMN_NAME,
                COLUMN_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                COLUMN_KEY
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'student_room_history'
            ORDER BY ORDINAL_POSITION
        `);

        console.table(rows);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

inspectStudentRoomHistory();
