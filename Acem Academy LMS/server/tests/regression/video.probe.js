/*
 * Regression suite: Day 6 - Upload Video Validation (12 assertions).
 *
 * DEFERRED - NOT RUN. This suite asserts the Priority 1 type-aware video.url
 * behavior (an empty URL is allowed for video.type === "upload" on create and
 * update, and an empty video.thumbnail is treated as absent). Priority 1 is
 * intentionally deferred, so the current validator rejects empty video.url /
 * video.thumbnail and these assertions would fail. This file is kept intact
 * and is NOT registered in run.js (no `video` suite, no `test:video` script).
 * Re-register it in run.js and package.json when Priority 1 is implemented.
 *
 * Mutation-testing: creates a temp course tree, then purges temp records and
 * asserts DB counts are restored to the pre-run baseline. Requires a running
 * API server; PROBE_BASE overrides the URL.
 * Manual run (only after Priority 1 lands):
 *   node tests/regression/run.js video   (after re-adding the suite)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const TAG = "VC6 ";

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
    return {
        status: res.status,
        data: parsed ? parsed.data : null,
        msg: parsed ? parsed.message : null,
        errors: parsed && Array.isArray(parsed.errors) ? parsed.errors : null,
    };
};

const lessonForm = ({ title, topic, video, position }) => {
    const f = new FormData();
    f.append("title", title);
    f.append("topic", topic);
    if (position !== undefined) f.append("position", String(position));
    if (video !== undefined) f.append("videoData", JSON.stringify(video));
    return f;
};

const created = { courses: [], subcourses: [], chapters: [], topics: [], lessons: [] };
const track = (bucket, id) => { if (id) created[bucket].push(id); };
const idOf = (d) => (d && (d._id ? d._id.toString() : null)) || null;
const errText = (r) => JSON.stringify(r.errors || r.msg);
const hasErr = (r, needle) => Array.isArray(r.errors) && r.errors.some((m) => String(m).includes(needle));

const COLLECTIONS = ["courses", "subcourses", "chapters", "topics", "lessons"];
const preexisting = { courses: null, subcourses: null, chapters: null, topics: null, lessons: null };
const baseline = {};

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
            const leftovers = await db.collection(coll).find({ title: new RegExp(`^${TAG}`) }, { projection: { _id: 1 } }).toArray();
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

const YT_VALID = { type: "youtube", url: "https://youtu.be/abc123", duration: 0, thumbnail: "" };
const YT_INVALID = { type: "youtube", url: "notaurl", duration: 0, thumbnail: "" };
const YT_EXTERNAL = { type: "youtube", url: "https://example.com/video.mp4", duration: 0, thumbnail: "" };
const UPLOAD_EMPTY = { type: "upload", url: "", duration: 0, thumbnail: "" };

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const baseDb = mongoose.connection.db;
    for (const coll of COLLECTIONS) {
        const rows = await baseDb.collection(coll).find({}, { projection: { _id: 1 } }).toArray();
        preexisting[coll] = rows.map((d) => d._id.toString());
    }
    for (const coll of ["courses", "subcourses", "chapters", "topics", "lessons", "enrollments", "users"]) {
        baseline[coll] = await baseDb.collection(coll).countDocuments();
    }

    /* ---- Phase 1: setup temp course tree ---- */
    const mkCourse = await req("POST", "/courses", {
        who: TEACHER,
        json: { title: `${TAG}Temp Course`, courseCode: `VC6-${Date.now()}`, description: "Day 6 video validation temp course" },
    });
    const T = idOf(mkCourse.data); track("courses", T);
    check("1.1 setup: temp course created", mkCourse.status >= 200 && mkCourse.status < 300 && T, `status=${mkCourse.status}`);
    const pub = await req("PATCH", `/courses/${T}/publish`, { who: TEACHER, json: { status: "published" } });
    check("1.2 setup: temp course published", pub.status === 200, `status=${pub.status}`);
    const s1 = await req("POST", "/sub-courses", { who: TEACHER, json: { course: T, title: `${TAG}Sub` } });
    const S = idOf(s1.data); track("subcourses", S);
    const c1 = await req("POST", "/chapters", { who: TEACHER, json: { subCourse: S, title: `${TAG}Chapter` } });
    const C = idOf(c1.data); track("chapters", C);
    const t1 = await req("POST", "/topics", { who: TEACHER, json: { chapter: C, title: `${TAG}Topic` } });
    const TP = idOf(t1.data); track("topics", TP);

    /* ---- Phase 2: CREATE video.url validation ---- */
    const cu = await req("POST", "/lessons", { who: TEACHER, form: lessonForm({ title: `${TAG}Upload Empty`, topic: TP, video: UPLOAD_EMPTY }) });
    const CU = idOf(cu.data); track("lessons", CU);
    check("2.1 CREATE upload type with empty url is accepted (2xx)", cu.status >= 200 && cu.status < 300 && CU, `status=${cu.status} errors=${errText(cu)}`);

    const cy = await req("POST", "/lessons", { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube Valid`, topic: TP, video: YT_VALID }) });
    const CY = idOf(cy.data); track("lessons", CY);
    check("2.2 CREATE valid YouTube url is accepted (2xx)", cy.status >= 200 && cy.status < 300 && CY, `status=${cy.status} errors=${errText(cy)}`);

    const ci = await req("POST", "/lessons", { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube Invalid`, topic: TP, video: YT_INVALID }) });
    check("2.3 CREATE invalid YouTube url is rejected (400/'Invalid video URL')", ci.status === 400 && hasErr(ci, "Invalid video URL"), `status=${ci.status} errors=${errText(ci)}`);

    const ce = await req("POST", "/lessons", { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube External`, topic: TP, video: YT_EXTERNAL }) });
    check("2.4 CREATE valid-but-non-YouTube url is rejected (400/'valid YouTube')", ce.status === 400 && hasErr(ce, "valid YouTube video URL"), `status=${ce.status} errors=${errText(ce)}`);

    /* ---- Phase 3: UPDATE video.url validation ---- */
    const baseLesson = CY || CU;
    const uu = await req("PATCH", `/lessons/${baseLesson}`, { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube Valid`, topic: TP, video: UPLOAD_EMPTY }) });
    check("3.1 UPDATE upload type with empty url is accepted (2xx)", uu.status >= 200 && uu.status < 300, `status=${uu.status} errors=${errText(uu)}`);

    const uy = await req("PATCH", `/lessons/${baseLesson}`, { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube Valid`, topic: TP, video: YT_VALID }) });
    check("3.2 UPDATE valid YouTube url is accepted (2xx)", uy.status >= 200 && uy.status < 300, `status=${uy.status} errors=${errText(uy)}`);

    const ui = await req("PATCH", `/lessons/${baseLesson}`, { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube Valid`, topic: TP, video: YT_INVALID }) });
    check("3.3 UPDATE invalid YouTube url is rejected (400/'Invalid video URL')", ui.status === 400 && hasErr(ui, "Invalid video URL"), `status=${ui.status} errors=${errText(ui)}`);

    const ue = await req("PATCH", `/lessons/${baseLesson}`, { who: TEACHER, form: lessonForm({ title: `${TAG}YouTube Valid`, topic: TP, video: YT_EXTERNAL }) });
    check("3.4 UPDATE valid-but-non-YouTube url is rejected (400/'valid YouTube')", ue.status === 400 && hasErr(ue, "valid YouTube video URL"), `status=${ue.status} errors=${errText(ue)}`);

    /* ---- Phase 4: purge temp records + restore baseline counts ---- */
    const db = mongoose.connection.db;
    const purged = await purgeTempRecords(db);
    for (const coll of COLLECTIONS) {
        console.log(`PURGE ${coll}: deleted=${purged[coll]}`);
    }
    const counts = {};
    for (const coll of Object.keys(baseline)) {
        counts[coll] = await db.collection(coll).countDocuments();
    }
    const baseOk = Object.keys(baseline).every((k) => counts[k] === baseline[k]);
    check("4.1 DB counts restored to baseline", baseOk, `now=${JSON.stringify(counts)} baseline=${JSON.stringify(baseline)}`);

    const strayCourse = await db.collection("courses").countDocuments({ title: new RegExp(`^${TAG}`) });
    const strayLesson = await db.collection("lessons").countDocuments({ title: new RegExp(`^${TAG}`) });
    check("4.2 no stray VC6 records", strayCourse === 0 && strayLesson === 0, `courses=${strayCourse} lessons=${strayLesson}`);

    await mongoose.disconnect();

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n=== ${results.length - failed}/${results.length} assertions passed, ${failed} failed ===`);
    process.exit(failed === 0 ? 0 : 1);
})().catch(async (e) => {
    console.error("PROBE ERROR:", e && e.stack ? e.stack : e);
    try {
        let db = mongoose.connection.db;
        if (!db) {
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
