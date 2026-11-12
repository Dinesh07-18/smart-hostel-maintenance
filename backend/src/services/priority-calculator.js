// Proposed project policy v1.0. Scores are normalized to 0-100.
const FACTOR_WEIGHTS = Object.freeze({
    severity: 0.5,
    urgency: 0.3,
    waiting_time: 0.2
});

const INPUT_SCORES = Object.freeze({
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 100
});

function scoreWaitingTime(hoursWaiting) {
    const hours = Number(hoursWaiting);
    if (!Number.isFinite(hours) || hours < 0) {
        throw new TypeError("Waiting time must be a non-negative number of hours");
    }
    if (hours < 24) return 0;
    if (hours < 48) return 25;
    if (hours < 72) return 50;
    if (hours < 96) return 75;
    return 100;
}

function classifyPriority(totalScore) {
    const score = Number(totalScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new TypeError("Total priority score must be between 0 and 100");
    }
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
}

function calculatePriority({ severity, urgency, hoursWaiting = 0 }) {
    const severityKey = String(severity || "").toUpperCase();
    const urgencyKey = String(urgency || "").toUpperCase();
    if (!Object.hasOwn(INPUT_SCORES, severityKey)) {
        throw new TypeError("Severity must be LOW, MEDIUM, HIGH or CRITICAL");
    }
    if (!Object.hasOwn(INPUT_SCORES, urgencyKey)) {
        throw new TypeError("Urgency must be LOW, MEDIUM, HIGH or CRITICAL");
    }

    const severityScore = INPUT_SCORES[severityKey];
    const urgencyScore = INPUT_SCORES[urgencyKey];
    const waitingTimeScore = scoreWaitingTime(hoursWaiting);
    const totalScore = Number((
        severityScore * FACTOR_WEIGHTS.severity +
        urgencyScore * FACTOR_WEIGHTS.urgency +
        waitingTimeScore * FACTOR_WEIGHTS.waiting_time
    ).toFixed(3));

    return {
        severity_score: severityScore,
        urgency_score: urgencyScore,
        waiting_time_score: waitingTimeScore,
        total_priority_score: totalScore,
        priority_level: classifyPriority(totalScore)
    };
}

module.exports = {
    FACTOR_WEIGHTS,
    INPUT_SCORES,
    scoreWaitingTime,
    classifyPriority,
    calculatePriority
};
