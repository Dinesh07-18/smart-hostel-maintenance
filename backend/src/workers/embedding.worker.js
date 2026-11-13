"use strict";
require("dotenv").config();

const pool = require("../config/database");
const { indexComplaint } = require("../services/vector.service");

const POLL_MS = 5000;
const LEASE_MINUTES = 5;
const RETRY_DELAYS = [10, 30, 60, 300, 900];
let stopping = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function claimJob() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            "UPDATE complaint_embedding_jobs SET status='FAILED', lease_expires_at=NULL, last_error=COALESCE(last_error, 'Worker lease expired after final attempt') WHERE status='PROCESSING' AND lease_expires_at < NOW() AND attempt_count >= max_attempts"
        );

        const [jobs] = await connection.execute(
            "SELECT job_id, complaint_id, attempt_count, max_attempts FROM complaint_embedding_jobs WHERE ((status IN ('PENDING','RETRY') AND next_attempt_at <= NOW()) OR (status='PROCESSING' AND lease_expires_at < NOW())) AND attempt_count < max_attempts ORDER BY created_at, job_id LIMIT 1 FOR UPDATE"
        );

        if (!jobs.length) {
            await connection.commit();
            return null;
        }

        const job = jobs[0];
        await connection.execute(
            "UPDATE complaint_embedding_jobs SET status='PROCESSING', attempt_count=attempt_count+1, lease_expires_at=DATE_ADD(NOW(), INTERVAL ? MINUTE), last_error=NULL WHERE job_id=?",
            [LEASE_MINUTES, job.job_id]
        );

        await connection.commit();
        job.attempt_count = Number(job.attempt_count) + 1;
        return job;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function processJob(job) {
    try {
        const [rows] = await pool.execute(
            "SELECT complaint_id, hostel_id, category_id, title, description FROM complaints WHERE complaint_id=? LIMIT 1",
            [job.complaint_id]
        );

        if (!rows.length) throw new Error("Complaint no longer exists");

        await indexComplaint(rows[0]);

        await pool.execute(
            "UPDATE complaint_embedding_jobs SET status='COMPLETED', lease_expires_at=NULL, last_error=NULL WHERE job_id=? AND status='PROCESSING'",
            [job.job_id]
        );
        console.log("Embedding job completed:", job.job_id);
    } catch (error) {
        const message = String(error && error.message || error).slice(0, 4000);
        const exhausted = job.attempt_count >= Number(job.max_attempts);
        const delay = RETRY_DELAYS[Math.min(job.attempt_count - 1, RETRY_DELAYS.length - 1)];

        await pool.execute(
            "UPDATE complaint_embedding_jobs SET status=?, lease_expires_at=NULL, last_error=?, next_attempt_at=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE job_id=? AND status='PROCESSING'",
            [exhausted ? "FAILED" : "RETRY", message, delay, job.job_id]
        );

        console.error("Embedding job", job.job_id, exhausted ? "failed permanently:" : "will retry:", message);
    }
}

async function main() {
    const [tables] = await pool.execute(
        "SHOW TABLES LIKE 'complaint_embedding_jobs'"
    );
    if (!tables.length) {
        throw new Error("Queue table is missing. Apply the Phase 4 migration first.");
    }

    console.log("Complaint embedding worker started.");
    while (!stopping) {
        try {
            const job = await claimJob();
            if (job) await processJob(job);
            else await sleep(POLL_MS);
        } catch (error) {
            console.error("Worker loop error:", error.message);
            await sleep(POLL_MS);
        }
    }

    await pool.end();
    console.log("Worker stopped.");
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

main().catch(async error => {
    console.error("Worker fatal error:", error);
    try { await pool.end(); } catch (_) {}
    process.exitCode = 1;
});
