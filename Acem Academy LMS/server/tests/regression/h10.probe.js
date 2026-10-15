/*
 * Regression suite: H10 - Lesson List Access (40 assertions).
 * Read-only (no DB writes). Requires a running API server; PROBE_BASE overrides the URL.
 * Run: npm run test:h10   (or: node tests/regression/run.js h10)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const lessonService = require("../../src/services/lesson.service");
const Lesson = require("../../src/models/lesson.model");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TOPIC_HTML = "6a7ecff1c66e8b43dd2ccd94"; // course 6a7ec982 (HTML): 2 published + 1 draft
const DRAFT_LESSON = "6a9ffdeb017ebdb3ccc8d0e3"; // draft w/ quiz, answers [1,2]
const PUBLISHED_LESSON = "6a7ee40ec66e8b43dd2ccd97"; // "What is HTML?"
const TOPIC_PHYSICS_QUIZ = "6aa91a127cc1e3248431c182"; // course 6aa919a1 (physics), published lesson w/ 25-question quiz; enrolled student active

const USERS = {
    anon: null,
    unenrolled: "6a707973e4a774afc478ea9d", // test@gmail.com, 0 enrollments
    enrolled: "6a6afdd25da7a16903c74381", // aman02, non-cancelled enrollment in HTML course
    teacher: "6a71e1861ea02a2f75b9c7fd",
    admin: "6a703908e4a774afc478ea9b",
};

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const headersFor = (who) => {
    if (!who) return {};
    const token = jwt.sign(
        { id: who, role: who === USERS.admin ? "admin" : who === USERS.teacher ? "teacher" : "student" },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10m" }
    );
    return { Cookie: `accessToken=${token}` };
};

const get = async (who, path) => {
    const res = await fetch(`${BASE}/api/v1${path}`, { headers: headersFor(who) });
    let body = null;
    try { body = await res.json(); } catch { /* none */ }
    return { status: res.status, data: body ? body.data : null, raw: body };
};

const post = async (who, path, payload) => {
    const res = await fetch(`${BASE}/api/v1${path}`, {
        method: "POST",
        headers: { ...headersFor(who), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    let body = null;
    try { body = await res.json(); } catch { /* none */ }
    return { status: res.status, data: body ? body.data : null, raw: body };
};

const SYLLABUS_KEYS = ["_id", "title", "description", "position", "status", "topic"];
const FORBIDDEN_KEYS = ["content", "video", "attachments", "quiz"];
const hasAnyKey = (obj, keys) => keys.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
const positionsAsc = (list) => list.every((l, i) => i === 0 || l.position >= list[i - 1].position);

(async () => {
    // 1. Anonymous unchanged
    const anon = await get(null, "/lessons");
    check("1. anonymous GET /lessons => 401", anon.status === 401, `status=${anon.status}`);

    // 2. Unenrolled student, topic-filtered
    const uTopic = await get(USERS.unenrolled, `/lessons?topic=${TOPIC_HTML}`);
    const uList = Array.isArray(uTopic.data) ? uTopic.data : [];
    check("2a. unenrolled GET /lessons?topic => 200", uTopic.status === 200, `status=${uTopic.status}`);
    check("2b. syllabus keys present", uList.length >= 1 && uList.every((l) => SYLLABUS_KEYS.every((k) => k in l)), `n=${uList.length}`);
    const leaked = uList.map((l) => hasAnyKey(l, FORBIDDEN_KEYS)).filter((a) => a.length);
    check("2c. NO content/video/attachments/quiz", leaked.length === 0, `leaks=${JSON.stringify(leaked)}`);
    check("2d. topic filter intact", uList.every((l) => (l.topic ? l.topic._id || l.topic : "").toString() === TOPIC_HTML), `n=${uList.length}`);
    check("2e. ordering intact (position asc)", positionsAsc(uList), `positions=${JSON.stringify(uList.map((l) => l.position))}`);

    // 3. Unenrolled student, global list: drafts gone
    const uAll = await get(USERS.unenrolled, "/lessons");
    const uAllList = Array.isArray(uAll.data) ? uAll.data : [];
    const nonPub = uAllList.filter((l) => l.status !== "published");
    const anyLeak = uAllList.some((l) => hasAnyKey(l, FORBIDDEN_KEYS).length > 0);
    check("3a. unenrolled global list all published", uAll.status === 200 && nonPub.length === 0, `status=${uAll.status} n=${uAllList.length} nonPublished=${nonPub.length}`);
    check("3b. unenrolled global list no content/video/attachments/quiz", !anyLeak, `anyLeak=${anyLeak}`);
    check("3c. syllabus keys present globally", uAllList.every((l) => ["_id", "title", "position", "status"].every((k) => k in l)), `n=${uAllList.length}`);

    // 4. Enrolled student (CRITICAL - Learning.jsx)
    const eTopic = await get(USERS.enrolled, `/lessons?topic=${TOPIC_HTML}`);
    const eList = Array.isArray(eTopic.data) ? eTopic.data : [];
    check("4a. enrolled GET /lessons?topic => 200", eTopic.status === 200, `status=${eTopic.status}`);
    check("4b. enrolled sees only published lessons (drafts hidden)", eList.length === 2, `n=${eList.length}`);
    const first = eList.find((l) => l._id === PUBLISHED_LESSON) || eList[0] || {};
    check("4c. content present", "content" in first && first.content !== null && first.content !== undefined, `contentExcerpt=${JSON.stringify(String(first.content).slice(0, 40))}`);
    check("4d. video + attachments keys present", "video" in first && "attachments" in first, `keys=${Object.keys(first).join(",")}`);
    check("4e. draft lesson absent from enrolled list", !eList.some((l) => l._id === DRAFT_LESSON), `ids=${JSON.stringify(eList.map((l) => l._id))}`);
    const questions = eList.flatMap((l) => (l.quiz && Array.isArray(l.quiz.questions) ? l.quiz.questions : []));
    const keyLeak = questions.some((q) => "correctAnswer" in q || "explanation" in q);
    check("4f. correctAnswer + explanation stripped for student", !keyLeak, `q=${questions.length} leak=${keyLeak}`);
    check("4g. ordering intact", positionsAsc(eList), `positions=${JSON.stringify(eList.map((l) => l.position))}`);

    // 4h. Enrolled student global list keeps content for enrolled course
    const eAll = await get(USERS.enrolled, "/lessons");
    const eAllList = Array.isArray(eAll.data) ? eAll.data : [];
    const htmlLesson = eAllList.find((l) => l._id === PUBLISHED_LESSON) || {};
    check("4h. enrolled global list keeps content", eAll.status === 200 && "content" in htmlLesson && htmlLesson.content != null, `status=${eAll.status}`);

    // 5. Teacher: full data incl. answer keys (existing behavior)
    const tAll = await get(USERS.teacher, "/lessons");
    const tList = Array.isArray(tAll.data) ? tAll.data : [];
    const tDraft = tList.find((l) => l._id === DRAFT_LESSON) || {};
    const tQ = tDraft.quiz && Array.isArray(tDraft.quiz.questions) ? tDraft.quiz.questions : [];
    check("5a. teacher sees drafts + content", tAll.status === 200 && "content" in tDraft, `status=${tAll.status} n=${tList.length}`);
    check("5b. teacher sees quiz answer keys", tQ.length > 0 && tQ.every((q) => "correctAnswer" in q), `q=${tQ.length}`);

    // 6. Admin: full access
    const aAll = await get(USERS.admin, "/lessons");
    const aList = Array.isArray(aAll.data) ? aAll.data : [];
    const aDraft = aList.find((l) => l._id === DRAFT_LESSON) || {};
    const aQ = aDraft.quiz && Array.isArray(aDraft.quiz.questions) ? aDraft.quiz.questions : [];
    check("6a. admin sees drafts + content", aAll.status === 200 && "content" in aDraft, `status=${aAll.status} n=${aList.length}`);
    check("6b. admin sees quiz answer keys", aQ.length > 0 && aQ.every((q) => "correctAnswer" in q), `q=${aQ.length}`);

    // 7. C4 by-ID protection unchanged
    const byId = await get(USERS.unenrolled, `/lessons/${PUBLISHED_LESSON}`);
    check("7. unenrolled GET /lessons/:id => 403 (C4 intact)", byId.status === 403, `status=${byId.status}`);
    const byIdEnrolled = await get(USERS.enrolled, `/lessons/${PUBLISHED_LESSON}`);
    check("7b. enrolled GET /lessons/:id => 200", byIdEnrolled.status === 200, `status=${byIdEnrolled.status}`);

    // 8. Quiz submit honours publication visibility (draft lesson hidden)
    const submitDraft = await post(USERS.enrolled, `/lessons/${DRAFT_LESSON}/quiz/submit`, { answers: [1, 2] });
    check("8a. enrolled quiz submit on DRAFT lesson => 404 (hidden)", submitDraft.status === 404, `status=${submitDraft.status}`);
    const submitPub = await post(USERS.enrolled, `/lessons/${PUBLISHED_LESSON}/quiz/submit`, { answers: [0] });
    check("8b. enrolled quiz submit on published lesson reached (no active quiz => 400)", submitPub.status === 400, `status=${submitPub.status} msg=${JSON.stringify(submitPub.raw && submitPub.raw.message)}`);
    const submitDeny = await post(USERS.unenrolled, `/lessons/${DRAFT_LESSON}/quiz/submit`, { answers: [1, 2] });
    check("8c. unenrolled quiz submit on DRAFT lesson => 404 (publication hides it)", submitDeny.status === 404, `status=${submitDeny.status}`);

    // 9. topic filter returns exactly the topic's lessons (an ignoring-filter API would return more)
    const globalMatching = uAllList.filter((l) => (l.topic ? l.topic._id || l.topic : "").toString() === TOPIC_HTML);
    const topicIds = uList.map((l) => String(l._id)).sort();
    const globalMatchIds = globalMatching.map((l) => String(l._id)).sort();
    const sameSet = topicIds.length === globalMatchIds.length && topicIds.every((id, i) => id === globalMatchIds[i]);
    check("9. topic filter returns exactly the topic's lessons", uTopic.status === 200 && uList.length >= 1 && sameSet,
        `topicN=${uList.length} globalMatching=${globalMatching.length} sameSet=${sameSet}`);

    // 10. ordering is position-ascending on multi-item topic lists (not vacuous)
    const ascLists = [uList, eList];
    const allAscending = ascLists.every((lst) => positionsAsc(lst));
    check("10. topic lesson lists are position-ascending", allAscending && eList.length >= 2,
        `sizes=${ascLists.map((l) => l.length).join("/")} asc=${allAscending}`);

    // 11. Teacher ownership scoping of GET /lessons (service-level, read-only).
    // No second teacher exists as a real HTTP user, so a synthetic teacher id is
    // used (same pattern as day4.probe.js Phase 9). Only reads are performed.
    await mongoose.connect(process.env.MONGODB_URI);

    const fakeTeacher = { _id: new mongoose.Types.ObjectId(), role: "teacher" };
    const ownerTeacher = { _id: new mongoose.Types.ObjectId(USERS.teacher), role: "teacher" };
    const adminUser = { _id: new mongoose.Types.ObjectId(USERS.admin), role: "admin" };
    const enrolledStudentUser = { _id: new mongoose.Types.ObjectId(USERS.enrolled), role: "student" };

    // 11a. Teacher A cannot list Teacher B's lessons without a topic filter.
    const crossGlobal = await lessonService.getLessons(undefined, fakeTeacher);
    check("11a. cross-teacher global list is empty (no leak)", Array.isArray(crossGlobal) && crossGlobal.length === 0, `n=${crossGlobal.length}`);

    // 11b. Teacher A cannot list Teacher B's lessons using Teacher B's topicId (HTML).
    const crossTopicHtml = await lessonService.getLessons(TOPIC_HTML, fakeTeacher);
    check("11b. cross-teacher foreign topicId (HTML) list is empty (no bypass)", Array.isArray(crossTopicHtml) && crossTopicHtml.length === 0, `n=${crossTopicHtml.length}`);

    // 11c. Same guard for the quiz-bearing foreign topic.
    const crossTopicQuiz = await lessonService.getLessons(TOPIC_PHYSICS_QUIZ, fakeTeacher);
    check("11c. cross-teacher foreign topicId (quiz) list is empty (no bypass)", Array.isArray(crossTopicQuiz) && crossTopicQuiz.length === 0, `n=${crossTopicQuiz.length}`);

    // 11d. Teacher can still list their own lessons (incl. own drafts).
    const ownGlobal = await lessonService.getLessons(undefined, ownerTeacher);
    const ownIds = ownGlobal.map((l) => String(l._id));
    check("11d. owner teacher global list keeps own lessons", ownIds.includes(DRAFT_LESSON) && ownIds.includes(PUBLISHED_LESSON), `n=${ownIds.length}`);

    // 11e. Owner teacher topic filter returns own topic lessons only.
    const ownTopic = await lessonService.getLessons(TOPIC_HTML, ownerTeacher);
    const ownTopicOk = ownTopic.length >= 1 && ownTopic.every((l) => String(l.topic && (l.topic._id || l.topic)) === TOPIC_HTML);
    check("11e. owner teacher topic filter returns own topic only", ownTopicOk, `n=${ownTopic.length}`);

    // 12. Admin access unchanged.
    const totalLessons = await Lesson.countDocuments({ isDeleted: false });
    const adminGlobal = await lessonService.getLessons(undefined, adminUser);
    check("12a. admin global list unchanged (all non-deleted lessons)", adminGlobal.length === totalLessons, `n=${adminGlobal.length} total=${totalLessons}`);
    const adminDraft = adminGlobal.find((l) => String(l._id) === DRAFT_LESSON);
    const adminQ = adminDraft && adminDraft.quiz && Array.isArray(adminDraft.quiz.questions) ? adminDraft.quiz.questions : [];
    check("12b. admin keeps quiz answer keys", adminQ.length > 0 && adminQ.every((q) => "correctAnswer" in q), `q=${adminQ.length}`);

    // 13. Student visibility + answer redaction unchanged (non-vacuous: quiz lesson visible).
    const studentQuizList = await lessonService.getLessons(TOPIC_PHYSICS_QUIZ, enrolledStudentUser);
    const studentQ = studentQuizList.flatMap((l) => (l.quiz && Array.isArray(l.quiz.questions) ? l.quiz.questions : []));
    const studentLeak = studentQ.some((q) => "correctAnswer" in q || "explanation" in q);
    check("13a. student receives visible quiz lesson", studentQ.length === 25, `q=${studentQ.length}`);
    check("13b. student answer redaction unchanged (service-level)", !studentLeak, `q=${studentQ.length} leak=${studentLeak}`);

    // 14. Malformed topicId is rejected as a client error (not a 500 CastError).
    const badTopic = await get(USERS.enrolled, "/lessons?topic=not-a-mongo-id");
    check("14a. malformed topicId => 400 (not 500)", badTopic.status === 400, `status=${badTopic.status} msg=${JSON.stringify(badTopic.raw && badTopic.raw.message)}`);
    const emptyTopic = await get(USERS.enrolled, "/lessons?topic=");
    check("14b. empty topic param is ignored => 200", emptyTopic.status === 200, `status=${emptyTopic.status}`);
    const validTopic = await get(USERS.enrolled, `/lessons?topic=${TOPIC_HTML}`);
    check("14c. valid topicId still accepted => 200", validTopic.status === 200, `status=${validTopic.status}`);

    await mongoose.disconnect();

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n=== ${results.length - failed}/${results.length} assertions passed, ${failed} failed ===`);
    process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
    console.error("PROBE ERROR:", e.message);
    process.exit(2);
});
