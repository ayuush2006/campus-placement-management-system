// ==============================================================================
// utils/eligibilityHelper.js - Campus Placement Eligibility Engine
// Evaluates student eligibility against job requirements (CGPA, Branch, Backlogs)
// ==============================================================================

/**
 * Check if a student meets the eligibility criteria for a job opening
 *
 * Rules:
 * 1. student CGPA >= job minimum CGPA
 * 2. student branch matches allowed_branch (or allowed_branch is 'ALL')
 * 3. student backlogs <= job maximum allowed backlogs
 *
 * @param {Object} student - Student profile { cgpa, branch, backlogs }
 * @param {Object} job - Job requirements { minimum_cgpa, allowed_branch, maximum_backlogs }
 * @returns {Object} - { eligible: boolean, reasons: string[] }
 */
function checkEligibility(student, job) {
    const reasons = [];

    // 1. CGPA Requirement Evaluation
    const studentCgpa = parseFloat(student.cgpa !== undefined ? student.cgpa : 0);
    const minCgpa = parseFloat(job.minimum_cgpa !== undefined ? job.minimum_cgpa : 0);

    if (studentCgpa < minCgpa) {
        reasons.push(
            `CGPA requirement not satisfied: Your CGPA (${studentCgpa.toFixed(2)}) is lower than minimum required (${minCgpa.toFixed(2)})`
        );
    }

    // 2. Branch Requirement Evaluation
    const studentBranch = (student.branch || '').trim().toUpperCase();
    const rawAllowed = (job.allowed_branch || '').trim().toUpperCase();

    if (rawAllowed !== 'ALL') {
        const allowedBranches = rawAllowed.split(',').map(b => b.trim());
        if (!allowedBranches.includes(studentBranch)) {
            reasons.push(
                `Branch requirement not satisfied: Your branch (${studentBranch}) is not in allowed branches [${allowedBranches.join(', ')}]`
            );
        }
    }

    // 3. Backlogs Requirement Evaluation
    const studentBacklogs = parseInt(student.backlogs !== undefined ? student.backlogs : 0, 10);
    const maxBacklogs = parseInt(job.maximum_backlogs !== undefined ? job.maximum_backlogs : 0, 10);

    if (studentBacklogs > maxBacklogs) {
        reasons.push(
            `Backlogs requirement not satisfied: You have ${studentBacklogs} backlog(s), maximum allowed is ${maxBacklogs}`
        );
    }

    return {
        eligible: reasons.length === 0,
        reasons
    };
}

module.exports = {
    checkEligibility
};
