/*
 * Regression suite: Day 6 - Curriculum Create Mass Assignment (19 assertions).
 * Mutation-testing: creates a temp course tree, asserts client-supplied
 * server-managed fields are ignored on CREATE, then purges temp records and
 * asserts DB counts are restored to the pre-run baseline.
 * Requires a running API server; PROBE_BASE overrides the URL.
 * Run: npm run test:massassign   (or: node tests/regression/run.js massassign)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT = "6a707973e4a774afc478ea9d";
const TAG = "MA6 ";

const FAKE_ID = new mongoose.Types.ObjectId().toString();
const EPOCH = "2000-01-01T00:00:00.000Z";

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

const serverFieldsIntact = (doc) => {
    if (!doc) return { ok: false, detail: "doc=null" };
    const createdOk = doc.createdBy && doc.createdBy.toString() === TEACHER;
    const updatedOk = doc.updatedBy && doc.updatedBy.toString() === TEACHER;
    const statusOk = doc.status === "draft";
    const deletedOk = doc.isDeleted === false;
    const idOk = doc._id.toString() !== FAKE_ID;
    const tsOk = doc.createdAt && new Date(doc.createdAt).getTime() > new Date(EPOCH).getTime();
    return {
        ok: createdOk && updatedOk && statusOk && deletedOk && idOk && tsOk,
        detail: `createdBy=${doc.createdBy && doc.createdBy.toString()} updatedBy=${doc.updatedBy && doc.updatedBy.toString()} status=${doc.status} isDeleted=${doc.isDeleted} idOk=${idOk} tsOk=${tsOk}`,
    };
};

const hostile = (extra) => ({
    status: "published",
    isDeleted: true,
    createdBy: STUDENT,
    updatedBy: STUDENT,
    _id: FAKE_ID,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...extra,
});

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
        json: { title: `${TAG}Temp Course`, courseCode: `MA6-${Date.now()}`, description: "Day 6 mass-assignment temp course" },
    });
    const T = idOf(mkCourse.data);
    track("courses", T);
    check("1.1 setup: temp course created", mkCourse.status >= 200 && mkCourse.status < 300 && T, `status=${mkCourse.status} id=${T}`);
    const pub = await req("PATCH", `/courses/${T}/publish`, { who: TEACHER, json: { status: "published" } });
    check("1.2 setup: temp course published", pub.status === 200, `status=${pub.status}`);

    const db = mongoose.connection.db;

    /* ---- Phase 2: sub-course CREATE mass assignment ---- */
    const s1 = await req("POST", "/sub-courses", { who: TEACHER, json: hostile({ course: T, title: `${TAG}Sub Hostile`, description: "MA6 sub hostile", position: 3 }) });
    const S = idOf(s1.data); track("subcourses", S);
    check("2.1 sub-course hostile create accepted", s1.status >= 200 && s1.status < 300 && S, `status=${s1.status}`);
    const sDoc = await db.collection("subcourses").findOne({ _id: new mongoose.Types.ObjectId(S) });
    const sFields = serverFieldsIntact(sDoc);
    check("2.2 sub-course server-managed fields not overridden", sFields.ok, sFields.detail);
    check("2.3 sub-course valid fields stored", sDoc && sDoc.title === `${TAG}Sub Hostile` && sDoc.description === "MA6 sub hostile" && sDoc.position === 3 && sDoc.course.toString() === T,
        JSON.stringify({ title: sDoc && sDoc.title, position: sDoc && sDoc.position, course: sDoc && sDoc.course && sDoc.course.toString() }));

    /* ---- Phase 3: chapter CREATE mass assignment ---- */
    const c1 = await req("POST", "/chapters", { who: TEACHER, json: hostile({ subCourse: S, title: `${TAG}Chapter Hostile`, description: "MA6 chapter hostile", position: 2 }) });
    const C = idOf(c1.data); track("chapters", C);
    check("3.1 chapter hostile create accepted", c1.status >= 200 && c1.status < 300 && C, `status=${c1.status}`);
    const cDoc = await db.collection("chapters").findOne({ _id: new mongoose.Types.ObjectId(C) });
    const cFields = serverFieldsIntact(cDoc);
    check("3.2 chapter server-managed fields not overridden", cFields.ok, cFields.detail);
    check("3.3 chapter valid fields stored", cDoc && cDoc.title === `${TAG}Chapter Hostile` && cDoc.description === "MA6 chapter hostile" && cDoc.position === 2 && cDoc.subCourse.toString() === S,
        JSON.stringify({ title: cDoc && cDoc.title, position: cDoc && cDoc.position, subCourse: cDoc && cDoc.subCourse && cDoc.subCourse.toString() }));

    /* ---- Phase 4: topic CREATE mass assignment ---- */
    const t1 = await req("POST", "/topics", { who: TEACHER, json: hostile({ chapter: C, title: `${TAG}Topic Hostile`, description: "MA6 topic hostile", position: 2 }) });
    const TP = idOf(t1.data); track("topics", TP);
    check("4.1 topic hostile create accepted", t1.status >= 200 && t1.status < 300 && TP, `status=${t1.status}`);
    const tDoc = await db.collection("topics").findOne({ _id: new mongoose.Types.ObjectId(TP) });
    const tFields = serverFieldsIntact(tDoc);
    check("4.2 topic server-managed fields not overridden", tFields.ok, tFields.detail);
    check("4.3 topic valid fields stored", tDoc && tDoc.title === `${TAG}Topic Hostile` && tDoc.description === "MA6 topic hostile" && tDoc.position === 2 && tDoc.chapter.toString() === C,
        JSON.stringify({ title: tDoc && tDoc.title, position: tDoc && tDoc.position, chapter: tDoc && tDoc.chapter && tDoc.chapter.toString() }));

    /* ---- Phase 5: lesson CREATE mass assignment (multipart) ---- */
    const lessonForm = () => {
        const f = new FormData();
        f.append("title", `${TAG}Lesson Hostile`);
        f.append("description", "MA6 lesson hostile");
        f.append("topic", TP);
        f.append("position", "2");
        f.append("status", "published");
        f.append("isDeleted", "true");
        f.append("createdBy", STUDENT);
        f.append("updatedBy", STUDENT);
        f.append("_id", FAKE_ID);
        f.append("createdAt", EPOCH);
        f.append("updatedAt", EPOCH);
        return f;
    };
    const l1 = await req("POST", "/lessons", { who: TEACHER, form: lessonForm() });
    const L = idOf(l1.data); track("lessons", L);
    check("5.1 lesson hostile create accepted", l1.status >= 200 && l1.status < 300 && L, `status=${l1.status} msg=${JSON.stringify(l1.msg)}`);
    const lDoc = await db.collection("lessons").findOne({ _id: new mongoose.Types.ObjectId(L) });
    const lFields = serverFieldsIntact(lDoc);
    check("5.2 lesson server-managed fields not overridden", lFields.ok, lFields.detail);
    check("5.3 lesson valid fields stored", lDoc && lDoc.title === `${TAG}Lesson Hostile` && lDoc.description === "MA6 lesson hostile" && lDoc.position === 2 && lDoc.topic.toString() === TP,
        JSON.stringify({ title: lDoc && lDoc.title, position: lDoc && lDoc.position, topic: lDoc && lDoc.topic && lDoc.topic.toString() }));

    /* ---- Phase 6: ownership + validation remain effective ---- */
    const subCourseService = require("../../src/services/subCourse.service");
    const fakeTeacher = { _id: new mongoose.Types.ObjectId(), role: "teacher" };
    try {
        await subCourseService.createSubCourse({ course: T, title: `${TAG}Evil Sub` }, fakeTeacher);
        check("6.1 cross-teacher createSubCourse still 403", false, "no error thrown");
    } catch (e) {
        check("6.1 cross-teacher createSubCourse still 403", e.statusCode === 403, `statusCode=${e.statusCode} msg=${JSON.stringify(e.message)}`);
    }
    const noTitle = await req("POST", "/sub-courses", { who: TEACHER, json: { course: T } });
    check("6.2 create sub-course missing title still 400", noTitle.status === 400, `status=${noTitle.status}`);
    const badChapter = await req("POST", "/topics", { who: TEACHER, json: { chapter: "notanid", title: `${TAG}Topic X` } });
    check("6.3 create topic invalid chapter id still 400", badChapter.status === 400, `status=${badChapter.status}`);

    /* ---- Phase 7: purge temp records + restore baseline counts ---- */
    const purged = await purgeTempRecords(db);
    for (const coll of COLLECTIONS) {
        console.log(`PURGE ${coll}: deleted=${purged[coll]}`);
    }
    const counts = {};
    for (const coll of Object.keys(baseline)) {
        counts[coll] = await db.collection(coll).countDocuments();
    }
    const baseOk = Object.keys(baseline).every((k) => counts[k] === baseline[k]);
    check("7.1 DB counts restored to baseline", baseOk, `now=${JSON.stringify(counts)} baseline=${JSON.stringify(baseline)}`);

    const strayCourse = await db.collection("courses").countDocuments({ title: new RegExp(`^${TAG}`) });
    const strayLesson = await db.collection("lessons").countDocuments({ title: new RegExp(`^${TAG}`) });
    check("7.2 no stray MA6 records", strayCourse === 0 && strayLesson === 0, `courses=${strayCourse} lessons=${strayLesson}`);

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
