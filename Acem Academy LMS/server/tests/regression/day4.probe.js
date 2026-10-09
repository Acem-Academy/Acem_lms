/*
 * Regression suite: Day 4 - Teacher Core Flows (83 assertions).
 * Mutation-testing: creates temp records, then purges them and asserts counts are restored to baseline.
 * Requires a running API server; PROBE_BASE overrides the URL.
 * Run: npm run test:day4   (or: node tests/regression/run.js day4)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const ADMIN = "6a703908e4a774afc478ea9b";
const STUDENT = "6a707973e4a774afc478ea9d";
const BASELINE = { courses: 7, lessons: 13, subcourses: 9, chapters: 9, topics: 7, enrollments: 6, users: 9 };

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tok = (id) => jwt.sign({ id, role: "x" }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
const H = (id) => (id ? { Cookie: `accessToken=${tok(id)}` } : {});

const req = async (method, path, { who, json, form } = {}) => {
    const headers = { ...H(who) };
    let body;
    if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    } else if (form) {
        body = form;
    }
    const res = await fetch(`${BASE}/api/v1${path}`, { method, headers, body });
    let parsed = null;
    try { parsed = await res.json(); } catch { /* none */ }
    return { status: res.status, data: parsed ? parsed.data : null, msg: parsed ? parsed.message : null };
};

const created = { courses: [], subcourses: [], chapters: [], topics: [], lessons: [] };
const track = (bucket, id) => { if (id) created[bucket].push(id); };
const idOf = (d) => (d && (d._id ? d._id.toString() : null)) || null;

const COLLECTIONS = ["courses", "subcourses", "chapters", "topics", "lessons"];
// Snapshot of pre-existing _ids per collection, captured before any probe writes,
// so the safety-net purge can never delete an existing LMS record.
const preexisting = { courses: null, subcourses: null, chapters: null, topics: null, lessons: null };

// Deletes ONLY records created by this probe: tracked response ids plus any
// probe-tagged ("D4 " title) record that appeared after the baseline snapshot.
const purgeTempRecords = async (db) => {
    const summary = {};
    for (const coll of COLLECTIONS) {
        let deleted = 0;
        const ids = created[coll].filter(Boolean).map((x) => new mongoose.Types.ObjectId(x));
        if (ids.length) {
            const res = await db.collection(coll).deleteMany({ _id: { $in: ids } });
            deleted += res.deletedCount;
        }
        if (preexisting[coll]) {
            const pre = new Set(preexisting[coll]);
            const leftovers = await db.collection(coll).find({ title: /^D4 / }, { projection: { _id: 1 } }).toArray();
            const toDelete = leftovers.filter((d) => !pre.has(d._id.toString())).map((d) => d._id);
            if (toDelete.length) {
                const res2 = await db.collection(coll).deleteMany({ _id: { $in: toDelete } });
                deleted += res2.deletedCount;
            }
        }
        summary[coll] = deleted;
    }
    return summary;
};

const expectStatus = async (name, expected /* array */, p) => {
    const r = await p;
    check(name, expected.includes(r.status), `status=${r.status} msg=${JSON.stringify(r.msg)}`);
    return r;
};

(async () => {
    // Connect up-front so emergency cleanup always has a usable db handle,
    // even if an error occurs before Phase 9's original connection point.
    await mongoose.connect(process.env.MONGODB_URI);
    const baseDb = mongoose.connection.db;
    for (const coll of COLLECTIONS) {
        const rows = await baseDb.collection(coll).find({}, { projection: { _id: 1 } }).toArray();
        preexisting[coll] = rows.map((d) => d._id.toString());
    }

    /* ---- Phase 1: auth matrix ---- */
    check("1.1 anon my-courses 401", (await req("GET", "/courses/my-courses")).status === 401);
    check("1.2 student my-courses 403", (await req("GET", "/courses/my-courses", { who: STUDENT })).status === 403);
    check("1.3 admin my-courses 403 (authorize=TEACHER only)", (await req("GET", "/courses/my-courses", { who: ADMIN })).status === 403);
    const mine = await req("GET", "/courses/my-courses", { who: TEACHER });
    const mineList = Array.isArray(mine.data) ? mine.data : [];
    check("1.4 teacher my-courses 200, all own", mine.status === 200 && mineList.every((c) => (c.teacher._id || c.teacher).toString() === TEACHER), `status=${mine.status} n=${mineList.length}`);
    check("1.5 student GET /courses 200 (open read)", (await req("GET", "/courses", { who: STUDENT })).status === 200);
    check("1.6 anon GET /courses 401", (await req("GET", "/courses")).status === 401);
    const beforeList = await req("GET", "/courses", { who: TEACHER });
    const existingCode = (beforeList.data || [])[0]?.courseCode;

    /* ---- Phase 2: course create validation + create ---- */
    await expectStatus("2.1 create {} -> 400", [400], req("POST", "/courses", { who: TEACHER, json: {} }));
    await expectStatus("2.2 create short description -> 400", [400], req("POST", "/courses", { who: TEACHER, json: { title: "D4 Temp Course", courseCode: "D4X", description: "short" } }));
    const dup = await expectStatus("2.3 create duplicate courseCode -> 409", [409], req("POST", "/courses", { who: TEACHER, json: { title: "D4 Dup", courseCode: existingCode, description: "long enough description" } }));
    const mk = await req("POST", "/courses", {
        who: TEACHER,
        json: { title: "D4 Temp Course", courseCode: `D4-${Date.now()}`, description: "Day 4 temporary audit course", price: "42", duration: "10", visibility: "public" },
    });
    const T = idOf(mk.data);
    track("courses", T);
    check("2.4 valid create 2xx, default draft, teacher set, price cast", mk.status >= 200 && mk.status < 300 && mk.data && mk.data.status === "draft" && (mk.data.teacher._id || mk.data.teacher).toString() === TEACHER && mk.data.price === 42, `status=${mk.status} id=${T} status=${mk.data && mk.data.status}`);

    /* ---- Phase 3: publish gate + publish ---- */
    const gate = await expectStatus("3.1 sub-course on DRAFT course -> 400 gate", [400], req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: "D4 Sub A" } }));
    check("3.1b gate message", /not published/i.test(gate.msg || ""), `msg=${JSON.stringify(gate.msg)}`);
    await expectStatus("3.2 publish invalid status -> 400", [400], req("PATCH", `/courses/${T}/publish`, { who: TEACHER, json: { status: "nope" } }));
    const pub = await expectStatus("3.3 publish ok -> 200", [200], req("PATCH", `/courses/${T}/publish`, { who: TEACHER, json: { status: "published" } }));
    check("3.3b status is published", pub.data && pub.data.status === "published", `status=${pub.data && pub.data.status}`);
    await expectStatus("3.4 admin edits any course -> 200", [200], req("PATCH", `/courses/${T}`, { who: ADMIN, json: { title: "D4 Temp Course Admin Edit" } }));

    /* ---- Phase 4: course UPDATE mass-assignment stays closed (H9) ---- */
    await req("PATCH", `/courses/${T}`, { who: TEACHER, json: { title: "D4 Temp Course EDITED", status: "draft", isDeleted: true, teacher: STUDENT, createdBy: STUDENT, slug: "hacked" } });
    const afterHack = await req("GET", `/courses/${T}`, { who: TEACHER });
    const c = afterHack.data || {};
    check("4.1 H9: status/teacher/isDeleted/createdBy/slug smuggled on UPDATE ignored", afterHack.status === 200 && c.title === "D4 Temp Course EDITED" && c.status === "published" && (c.teacher._id || c.teacher).toString() === TEACHER && c.isDeleted !== true && c.slug !== "hacked",
        `get=${afterHack.status} title=${c.title} status=${c.status} isDeleted=${c.isDeleted} slug=${c.slug}`);

    /* ---- Phase 5: course validation ---- */
    await expectStatus("5.1 invalid visibility -> 400", [400], req("PATCH", `/courses/${T}`, { who: TEACHER, json: { visibility: "secret" } }));
    await expectStatus("5.2 title too short -> 400", [400], req("PATCH", `/courses/${T}`, { who: TEACHER, json: { title: "ab" } }));
    await expectStatus("5.3 invalid course id -> 400", [400], req("PATCH", "/courses/notanid", { who: TEACHER, json: { title: "abc" } }));

    /* ---- Phase 6: sub-course flow ---- */
    const s1 = await expectStatus("6.1 create sub-course -> 2xx", [200, 201], req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: "D4 Sub A" } }));
    const S1 = idOf(s1.data); track("subcourses", S1);
    await expectStatus("6.2 duplicate position -> 409", [409], req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: "D4 Sub Dup", position: 1 } }));
    await expectStatus("6.3 invalid title -> 400", [400], req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: "ab" } }));
    await expectStatus("6.4 invalid course id -> 400", [400], req("POST", "/sub-courses", { who: TEACHER, json: { course: "notanid", title: "D4 Sub X" } }));
    await expectStatus("6.5 delete sub-course -> 2xx", [200, 204], req("DELETE", `/sub-courses/${S1}`, { who: TEACHER }));
    // B1 fixed (Option A): recreate after soft-delete must auto-position past all rows (no 500).
    const recreate = await expectStatus("6.6 recreate after soft-delete -> 2xx (B1 no 500)", [200, 201], req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: "D4 Sub B" } }));
    track("subcourses", idOf(recreate.data));
    const s3 = await expectStatus("6.7 create at explicit free position -> 2xx", [200, 201], req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: "D4 Sub C", position: 5 } }));
    const S3 = idOf(s3.data); track("subcourses", S3);

    /* ---- Phase 7: chapter/topic/lesson chain ---- */
    const c1 = await expectStatus("7.1 create chapter -> 2xx", [200, 201], req("POST", "/chapters", { who: TEACHER, json: { subCourse: S3, title: "D4 Chapter A" } }));
    const C1 = idOf(c1.data); track("chapters", C1);
    await expectStatus("7.2 chapter dup position -> 409", [409], req("POST", "/chapters", { who: TEACHER, json: { subCourse: S3, title: "D4 Ch Dup", position: 1 } }));
    await expectStatus("7.3 chapter invalid title -> 400", [400], req("POST", "/chapters", { who: TEACHER, json: { subCourse: S3, title: "ab" } }));
    const t1 = await expectStatus("7.4 create topic -> 2xx", [200, 201], req("POST", "/topics", { who: TEACHER, json: { chapter: C1, title: "D4 Topic A" } }));
    const TP1 = idOf(t1.data); track("topics", TP1);
    await expectStatus("7.5 topic invalid chapter id -> 400", [400], req("POST", "/topics", { who: TEACHER, json: { chapter: "notanid", title: "D4 Topic X" } }));

    const lessonForm = () => { const f = new FormData(); f.append("title", "D4 Lesson A"); f.append("description", "Day 4 temporary lesson"); f.append("topic", TP1); return f; };
    const l1 = await expectStatus("7.6 create lesson (multipart) -> 2xx", [200, 201], req("POST", "/lessons", { who: TEACHER, form: lessonForm() }));
    const L1 = idOf(l1.data); track("lessons", L1);
    const badForm = () => { const f = new FormData(); f.append("title", "ab"); f.append("topic", TP1); return f; };
    await expectStatus("7.7 lesson invalid title -> 400", [400], req("POST", "/lessons", { who: TEACHER, form: badForm() }));
    await expectStatus("7.8 lesson publish invalid status -> 400", [400], req("PATCH", `/lessons/${L1}/publish`, { who: TEACHER, json: { status: "bogus" } }));
    const lp = await expectStatus("7.9 lesson publish ok -> 200", [200], req("PATCH", `/lessons/${L1}/publish`, { who: TEACHER, json: { status: "published" } }));
    check("7.9b lesson status published", lp.data && lp.data.status === "published", `status=${lp.data && lp.data.status}`);

    await expectStatus("7.10 edit chapter -> 200", [200], req("PATCH", `/chapters/${C1}`, { who: TEACHER, json: { title: "D4 Chapter A EDITED" } }));
    await expectStatus("7.11 edit topic -> 200", [200], req("PATCH", `/topics/${TP1}`, { who: TEACHER, json: { title: "D4 Topic A EDITED" } }));
    await expectStatus("7.12 edit lesson -> 200", [200], req("PATCH", `/lessons/${L1}`, { who: TEACHER, json: { title: "D4 Lesson A EDITED" } }));
    await expectStatus("7.13 edit sub-course -> 200", [200], req("PATCH", `/sub-courses/${S3}`, { who: TEACHER, json: { title: "D4 Sub C EDITED" } }));

    await expectStatus("7.14 delete lesson -> 2xx", [200, 204], req("DELETE", `/lessons/${L1}`, { who: TEACHER }));
    // B1 fixed (Option A): lesson recreate must auto-position past all rows (no 500).
    const lrecreate = await expectStatus("7.15 lesson recreate auto-position after delete -> 2xx (B1 no 500)", [200, 201], req("POST", "/lessons", { who: TEACHER, form: (() => { const f = new FormData(); f.append("title", "D4 Lesson B"); f.append("topic", TP1); return f; })() }));
    track("lessons", idOf(lrecreate.data));
    const l2 = await expectStatus("7.16 lesson recreate at explicit free position -> 2xx", [200, 201], req("POST", "/lessons", { who: TEACHER, form: (() => { const f = new FormData(); f.append("title", "D4 Lesson B"); f.append("topic", TP1); f.append("position", "9"); return f; })() }));
    const L2 = idOf(l2.data); track("lessons", L2);

    /* ---- Phase 8: hierarchy reads ---- */
    const scList = await req("GET", `/sub-courses?course=${T}`, { who: TEACHER });
    check("8.1 list sub-courses by course", scList.status === 200 && (scList.data || []).some((s) => idOf(s) === S3), `status=${scList.status} n=${(scList.data || []).length}`);
    const chList = await req("GET", `/chapters?subCourse=${S3}`, { who: TEACHER });
    check("8.2 list chapters by sub-course", chList.status === 200 && (chList.data || []).some((x) => idOf(x) === C1), `n=${(chList.data || []).length}`);
    const tpList = await req("GET", `/topics?chapter=${C1}`, { who: TEACHER });
    check("8.3 list topics by chapter", tpList.status === 200 && (tpList.data || []).some((x) => idOf(x) === TP1), `n=${(tpList.data || []).length}`);
    const lsList = await req("GET", `/lessons?topic=${TP1}`, { who: TEACHER });
    check("8.4 list lessons by topic", lsList.status === 200 && (lsList.data || []).some((x) => idOf(x) === L2), `n=${(lsList.data || []).length}`);
    check("8.5 owner teacher lesson by-id 200", (await req("GET", `/lessons/${L2}`, { who: TEACHER })).status === 200);
    check("8.6 owner by-ids 200", (await req("GET", `/sub-courses/${S3}`, { who: TEACHER })).status === 200 && (await req("GET", `/chapters/${C1}`, { who: TEACHER })).status === 200 && (await req("GET", `/topics/${TP1}`, { who: TEACHER })).status === 200);
    check("8.7 get-my-courses now includes temp course", (await req("GET", "/courses/my-courses", { who: TEACHER })).data.some((x) => idOf(x) === T));

    /* ---- Phase 9: cross-teacher service-level (no HTTP teacher-2 exists) ---- */
    if (!mongoose.connection.db) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    const fake = { _id: new mongoose.Types.ObjectId(), role: "teacher" };
    const adminUser = { _id: new mongoose.Types.ObjectId(ADMIN), role: "admin" };
    const courseService = require("../../src/services/course.service");
    const subCourseService = require("../../src/services/subCourse.service");
    const chapterService = require("../../src/services/chapter.service");
    const topicService = require("../../src/services/topic.service");
    const lessonService = require("../../src/services/lesson.service");

    const expect403 = async (name, fn) => {
        try {
            await fn();
            check(name, false, "no error thrown");
        } catch (e) {
            check(name, e.statusCode === 403, `statusCode=${e.statusCode} msg=${JSON.stringify(e.message)}`);
        }
    };
    const expectOk = async (name, fn) => {
        try {
            const r = await fn();
            check(name, true, r && r._id ? `id=${r._id}` : "ok");
        } catch (e) {
            check(name, false, `statusCode=${e.statusCode} msg=${JSON.stringify(e.message)}`);
        }
    };

    await expect403("9.1  cross-teacher updateCourse 403", () => courseService.updateCourse(T, { title: "HACK" }, null, fake));
    await expect403("9.2  cross-teacher deleteCourse 403", () => courseService.deleteCourse(T, fake));
    await expect403("9.3  cross-teacher publishCourse 403", () => courseService.publishCourse(T, { status: "draft" }, fake));
    await expect403("9.4  cross-teacher createSubCourse 403", () => subCourseService.createSubCourse({ course: T, title: "Evil Sub" }, fake));
    await expect403("9.5  cross-teacher getSubCourseById 403", () => subCourseService.getSubCourseById(S3, fake));
    await expect403("9.6  cross-teacher updateSubCourse 403", () => subCourseService.updateSubCourse(S3, { title: "Evil" }, fake));
    await expect403("9.7  cross-teacher deleteSubCourse 403", () => subCourseService.deleteSubCourse(S3, fake));
    await expect403("9.8  cross-teacher createChapter 403", () => chapterService.createChapter({ subCourse: S3, title: "Evil Ch" }, fake));
    await expect403("9.9  cross-teacher getChapterById 403", () => chapterService.getChapterById(C1, fake));
    await expect403("9.10 cross-teacher updateChapter 403", () => chapterService.updateChapter(C1, { title: "Evil" }, fake));
    await expect403("9.11 cross-teacher deleteChapter 403", () => chapterService.deleteChapter(C1, fake));
    await expect403("9.12 cross-teacher createTopic 403", () => topicService.createTopic({ chapter: C1, title: "Evil T" }, fake));
    await expect403("9.13 cross-teacher getTopicById 403", () => topicService.getTopicById(TP1, fake));
    await expect403("9.14 cross-teacher updateTopic 403", () => topicService.updateTopic(TP1, { title: "Evil" }, fake));
    await expect403("9.15 cross-teacher deleteTopic 403", () => topicService.deleteTopic(TP1, fake));
    await expect403("9.16 cross-teacher createLesson 403", () => lessonService.createLesson({ topic: TP1, title: "Evil L" }, null, fake));
    await expect403("9.17 cross-teacher getLessonById 403", () => lessonService.getLessonById(L2, fake));
    await expect403("9.18 cross-teacher updateLesson 403", () => lessonService.updateLesson(L2, { title: "Evil" }, null, fake));
    await expect403("9.19 cross-teacher deleteLesson 403", () => lessonService.deleteLesson(L2, fake));
    await expect403("9.20 cross-teacher publishLesson 403", () => lessonService.publishLesson(L2, { status: "draft" }, fake));
    await expectOk("9.21 admin bypass: getSubCourseById", () => subCourseService.getSubCourseById(S3, adminUser));
    await expectOk("9.22 admin bypass: getLessonById", () => lessonService.getLessonById(L2, adminUser));
    await expectOk("9.23 owner teacher: getLessonById (C3/C4 read)", () => lessonService.getLessonById(L2, { _id: new mongoose.Types.ObjectId(TEACHER), role: "teacher" }));

    /* ---- Phase 10: curriculum UPDATE mass-assignment blocked (H-1) ---- */
    const ma = await req("PATCH", `/sub-courses/${S3}`, { who: TEACHER, json: { title: "D4 Sub C PATCHED", isDeleted: true, status: "published", createdBy: STUDENT, course: "6a7ec982c66e8b43dd2ccd8e" } });
    const maGet = await req("GET", `/sub-courses/${S3}`, { who: TEACHER });
    check("10.1 H-1: allowed title updates, isDeleted/status ignored", ma.status === 200 && maGet.status === 200 && maGet.data && maGet.data.title === "D4 Sub C PATCHED",
        `patch=${ma.status} getAfter=${maGet.status} title=${maGet.data && maGet.data.title}`);
    const maDoc = await mongoose.connection.db.collection("subcourses").findOne({ _id: new mongoose.Types.ObjectId(S3) }, { projection: { createdBy: 1, course: 1, isDeleted: 1, status: 1 } });
    check("10.2 H-1: createdBy/course/isDeleted/status cannot be reassigned", maDoc && maDoc.createdBy && maDoc.createdBy.toString() === TEACHER && maDoc.course.toString() === T && maDoc.isDeleted === false && maDoc.status === "draft",
        JSON.stringify({ createdBy: maDoc && maDoc.createdBy && maDoc.createdBy.toString(), course: maDoc && maDoc.course && maDoc.course.toString(), isDeleted: maDoc && maDoc.isDeleted, status: maDoc && maDoc.status }));

    /* ---- Phase 11: course delete + orphan behavior ---- */
    await expect11();
    async function expect11() {
        await expectStatus("11.1 delete course -> 2xx", [200, 204], req("DELETE", `/courses/${T}`, { who: TEACHER }));
        check("11.2 deleted course by-id -> 404", (await req("GET", `/courses/${T}`, { who: TEACHER })).status === 404);
        const listAfter = await req("GET", "/courses/my-courses", { who: TEACHER });
        check("11.3 course gone from my-courses", listAfter.status === 200 && !(listAfter.data || []).some((x) => idOf(x) === T), `n=${(listAfter.data || []).length}`);
        const orphanCh = await req("GET", `/chapters?subCourse=${S3}`, { who: TEACHER });
        check("11.4 ORPHAN: children of deleted course still listable", orphanCh.status === 200 && (orphanCh.data || []).some((x) => idOf(x) === C1), `n=${(orphanCh.data || []).length}`);
        const orphanLs = await req("GET", `/lessons?topic=${TP1}`, { who: TEACHER });
        check("11.5 ORPHAN: lessons of deleted course still listable", orphanLs.status === 200 && (orphanLs.data || []).some((x) => idOf(x) === L2), `n=${(orphanLs.data || []).length}`);
    }

    /* ---- Phase 12: purge temp records + restore counts ---- */
    const db = mongoose.connection.db;
    const purged = await purgeTempRecords(db);
    for (const coll of COLLECTIONS) {
        console.log(`PURGE ${coll}: deleted=${purged[coll]}`);
    }
    const counts = {};
    for (const [k, cname] of Object.entries({ courses: "courses", lessons: "lessons", subcourses: "subcourses", chapters: "chapters", topics: "topics", enrollments: "enrollments", users: "users" })) {
        counts[k] = await db.collection(cname).countDocuments();
    }
    const ok = Object.keys(BASELINE).every((k) => counts[k] === BASELINE[k]);
    check("12.1 DB counts restored to baseline", ok, `now=${JSON.stringify(counts)} baseline=${JSON.stringify(BASELINE)}`);

    const strays = await db.collection("courses").countDocuments({ title: /^D4 / });
    const strays2 = await db.collection("lessons").countDocuments({ title: /^D4 / });
    check("12.2 no stray D4 records", strays === 0 && strays2 === 0, `courses=${strays} lessons=${strays2}`);

    await mongoose.disconnect();

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n=== ${results.length - failed}/${results.length} assertions passed, ${failed} failed ===`);
    process.exit(failed === 0 ? 0 : 1);
})().catch(async (e) => {
    console.error("PROBE ERROR:", e && e.stack ? e.stack : e);
    try {
        let db = mongoose.connection.db;
        if (!db) {
            // Error happened before the connection existed; open one now so any
            // records the probe already created can still be removed.
            await mongoose.connect(process.env.MONGODB_URI);
            db = mongoose.connection.db;
        }
        if (db) {
            const purged = await purgeTempRecords(db);
            console.log(`EMERGENCY PURGE done: ${JSON.stringify(purged)}`);
            await mongoose.disconnect();
        }
    } catch (purgeErr) {
        console.error("PURGE FAILED:", purgeErr.message);
    }
    process.exit(2);
});
