const pool = require("../config/database");
const VECTOR_URL = (process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

async function postJson(path, body) {
    const response = await fetch(`${VECTOR_URL}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(7000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Embedding service HTTP ${response.status}`);
    return data;
}

async function indexComplaint(c) {
    const indexed = await postJson("/index", {
        complaint_id: Number(c.complaint_id), hostel_id: Number(c.hostel_id),
        category_id: Number(c.category_id), title: c.title, description: c.description
    });
    const modelName = "sentence-transformers/all-MiniLM-L6-v2";
    const modelVersion = "2.7.0";
    const [rows] = await pool.execute(
        `SELECT model_id FROM embedding_models
         WHERE model_name=? AND model_version=? AND vector_dimension=? AND qdrant_collection=? LIMIT 1`,
        [modelName, modelVersion, indexed.vector_dimension, indexed.collection]
    );
    let modelId;
    if (rows.length) modelId = rows[0].model_id;
    else {
        const [inserted] = await pool.execute(
            `INSERT INTO embedding_models (model_name, model_version, vector_dimension, qdrant_collection, is_active)
             VALUES (?, ?, ?, ?, TRUE)`,
            [modelName, modelVersion, indexed.vector_dimension, indexed.collection]
        );
        modelId = inserted.insertId;
    }
    await pool.execute(
        `INSERT INTO complaint_embedding_references
         (complaint_id, model_id, qdrant_point_id, collection_name)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE qdrant_point_id=VALUES(qdrant_point_id),
           collection_name=VALUES(collection_name), updated_at=CURRENT_TIMESTAMP`,
        [c.complaint_id, modelId, indexed.point_id, indexed.collection]
    );
    return indexed;
}

async function findSimilarComplaints(user, text, limit = 5) {
    const userId = Number(user && user.user_id);
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Authenticated student identity required");
    const [assignments] = await pool.execute(
        `SELECT srh.hostel_id FROM student_profiles sp
         JOIN student_room_history srh ON srh.student_id=sp.student_id
         WHERE sp.user_id=? AND srh.is_active=1 AND srh.start_date<=NOW()
           AND (srh.end_date IS NULL OR srh.end_date>=NOW()) LIMIT 2`,
        [userId]
    );
    if (assignments.length !== 1) throw new Error("A single active hostel assignment is required");
    return postJson("/search", { hostel_id: Number(assignments[0].hostel_id), text, limit });
}
module.exports = { indexComplaint, findSimilarComplaints };
