const pool = require("../config/database");
const VECTOR_URL = (process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
const MODEL_NAME = process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
const MODEL_VERSION = process.env.EMBEDDING_MODEL_VERSION || "2.7.0";

async function postJson(path, body) {
    const response = await fetch(`${VECTOR_URL}${path}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(10000)
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
    if (!Number.isSafeInteger(Number(indexed.vector_dimension)) || Number(indexed.vector_dimension) <= 0) {
        throw new Error("Embedding service returned an invalid vector dimension");
    }
    const [rows] = await pool.execute(
        `SELECT model_id FROM embedding_models WHERE model_name=? AND model_version=? AND vector_dimension=? AND qdrant_collection=? LIMIT 1`,
        [MODEL_NAME, MODEL_VERSION, indexed.vector_dimension, indexed.collection]
    );
    let modelId;
    if (rows.length) modelId = rows[0].model_id;
    else {
        const [inserted] = await pool.execute(
            `INSERT INTO embedding_models (model_name, model_version, vector_dimension, qdrant_collection, is_active) VALUES (?, ?, ?, ?, TRUE)`,
            [MODEL_NAME, MODEL_VERSION, indexed.vector_dimension, indexed.collection]
        );
        modelId = inserted.insertId;
    }
    await pool.execute(
        `INSERT INTO complaint_embedding_references (complaint_id, model_id, qdrant_point_id, collection_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE qdrant_point_id=VALUES(qdrant_point_id), collection_name=VALUES(collection_name), updated_at=CURRENT_TIMESTAMP`,
        [c.complaint_id, modelId, indexed.point_id, indexed.collection]
    );
    return indexed;
}

async function getAuthorizedHostelIds(user) {
    const userId = Number(user?.user_id);
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Authenticated student identity required");
    if (user.role === "ADMINISTRATOR") {
        const [rows] = await pool.execute("SELECT hostel_id FROM hostels ORDER BY hostel_id");
        return rows.map(row => Number(row.hostel_id));
    }
    let sql;
    if (user.role === "STUDENT") {
        sql = `SELECT DISTINCT srh.hostel_id FROM student_profiles sp JOIN student_room_history srh ON srh.student_id=sp.student_id WHERE sp.user_id=? AND srh.is_active=1 AND srh.start_date<=NOW() AND (srh.end_date IS NULL OR srh.end_date>=NOW())`;
    } else if (user.role === "WARDEN") {
        sql = `SELECT DISTINCT hostel_id FROM warden_assignments WHERE user_id=? AND is_active=1 AND start_date<=CURRENT_DATE() AND (end_date IS NULL OR end_date>=CURRENT_DATE())`;
    } else if (user.role === "MAINTENANCE_STAFF") {
        sql = `SELECT DISTINCT sha.hostel_id FROM maintenance_staff_profiles msp JOIN staff_hostel_assignments sha ON sha.staff_id=msp.staff_id WHERE msp.user_id=? AND sha.is_active=1 AND sha.start_date<=CURRENT_DATE() AND (sha.end_date IS NULL OR sha.end_date>=CURRENT_DATE())`;
    } else {
        const error = new Error("This role cannot search complaints"); error.statusCode = 403; throw error;
    }
    const [rows] = await pool.execute(sql, [userId]);
    const ids = rows.map(row => Number(row.hostel_id));
    if (user.role === "STUDENT" && ids.length !== 1) {
        const error = new Error("A single active hostel assignment is required"); error.statusCode = 403; throw error;
    }
    if (!ids.length) { const error = new Error("No active hostel assignment found"); error.statusCode = 403; throw error; }
    return ids;
}

async function searchComplaints(user, text, limit = 5) {
    const hostelIds = await getAuthorizedHostelIds(user);
    if (!hostelIds.length) return [];
    const vectorResult = await postJson("/search", { hostel_ids: hostelIds, ...(hostelIds.length === 1 ? { hostel_id: hostelIds[0] } : {}), text, limit });
    const matches = Array.isArray(vectorResult.matches) ? vectorResult.matches : [];
    if (!matches.length) return [];
    const ids = [...new Set(matches.map(item => Number(item.complaint_id)).filter(id => Number.isSafeInteger(id) && id > 0))];
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    let accessJoin = "";
    let accessParams = [];
    if (user.role === "STUDENT") {
        accessJoin = "JOIN student_profiles requester ON requester.user_id=? JOIN student_room_history srh ON srh.student_id=requester.student_id AND srh.is_active=1 AND srh.start_date<=NOW() AND (srh.end_date IS NULL OR srh.end_date>=NOW()) AND srh.hostel_id=c.hostel_id";
        accessParams = [Number(user.user_id)];
    } else if (user.role === "WARDEN") {
        accessJoin = "JOIN warden_assignments wa ON wa.user_id=? AND wa.hostel_id=c.hostel_id AND wa.is_active=1 AND wa.start_date<=CURRENT_DATE() AND (wa.end_date IS NULL OR wa.end_date>=CURRENT_DATE())";
        accessParams = [Number(user.user_id)];
    } else if (user.role === "MAINTENANCE_STAFF") {
        accessJoin = "JOIN maintenance_staff_profiles msp ON msp.user_id=? JOIN staff_hostel_assignments sha ON sha.staff_id=msp.staff_id AND sha.hostel_id=c.hostel_id AND sha.is_active=1 AND sha.start_date<=CURRENT_DATE() AND (sha.end_date IS NULL OR sha.end_date>=CURRENT_DATE())";
        accessParams = [Number(user.user_id)];
    }
    const [rows] = await pool.execute(`
        SELECT c.complaint_id,c.title,c.description,c.status,c.severity,c.urgency,c.submitted_at,
               c.hostel_id,h.hostel_name,cc.category_id,cc.category_name
        FROM complaints c
        ${accessJoin}
        JOIN hostels h ON h.hostel_id=c.hostel_id
        JOIN complaint_categories cc ON cc.category_id=c.category_id
        WHERE c.complaint_id IN (${placeholders})
        AND c.hostel_id IN (${hostelIds.map(() => "?").join(",")})
    `, [...accessParams, ...ids, ...hostelIds]);
    const byId = new Map(rows.map(row => [Number(row.complaint_id), row]));
    return matches.map(match => {
        const row = byId.get(Number(match.complaint_id));
        if (!row) return null;
        const safeRow = user.role === "STUDENT" ? { ...row, description: null } : row;
        return { ...safeRow, similarity: Number(match.similarity) };
    }).filter(Boolean);
}

async function findSimilarComplaints(user, text, limit = 5) {
    return { matches: await searchComplaints(user, text, limit) };
}

module.exports = { indexComplaint, findSimilarComplaints, searchComplaints, getAuthorizedHostelIds };
