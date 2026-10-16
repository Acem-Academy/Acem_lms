const Lesson = require("../models/lesson.model");
const Topic = require("../models/topic.model");
const Chapter = require("../models/chapter.model");
const SubCourse = require("../models/subCourse.model");
const Enrollment = require("../models/enrollment.model");
const QuizAttempt = require("../models/quizAttempt.model");
const {
    uploadToCloudinary,
} = require("../utils/cloudinary");
const ApiError = require("../utils/ApiError");

const ROLES = require("../constants/roles");

const {
    LESSON_STATUS,
} = require("../constants/lesson.constants");

const {
    ENROLLMENT_STATUS,
} = require("../constants/enrollment.constants");

const {
    resolveOwningCourse,
    assertCurriculumOwnership,
    assertLessonReadAccess,
} = require("../utils/ownership");

const {
    isStudent,
    getPublishedTopicIds,
    isLessonPublishedForStudent,
} = require("../utils/curriculumVisibility");

/*
|--------------------------------------------------------------------------
| YouTube Helpers
|--------------------------------------------------------------------------
*/

const getYouTubeVideoId = (url) => {
    if (!url) return null;

    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/
    );

    return match ? match[1] : null;
};

const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);

    if (!videoId) return "";

    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/*
|--------------------------------------------------------------------------
| Quiz Validation Helper
|--------------------------------------------------------------------------
*/

const validateQuiz = (quiz) => {
    if (!quiz) return;

    if (
        quiz.questions !== undefined &&
        !Array.isArray(quiz.questions)
    ) {
        throw new ApiError(
            400,
            "Quiz questions must be an array."
        );
    }

    if (!Array.isArray(quiz.questions)) {
        return;
    }

    for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i];

        if (!question.question?.trim()) {
            throw new ApiError(
                400,
                `Question ${i + 1} is required.`
            );
        }

        if (
            !Array.isArray(question.options) ||
            question.options.length < 2
        ) {
            throw new ApiError(
                400,
                `Question ${i + 1} must have at least 2 options.`
            );
        }

        const hasEmptyOption = question.options.some(
            (option) =>
                typeof option !== "string" ||
                !option.trim()
        );

        if (hasEmptyOption) {
            throw new ApiError(
                400,
                `Question ${i + 1} contains an empty option.`
            );
        }

        const correctAnswer = Number(
            question.correctAnswer
        );

        if (
            !Number.isInteger(correctAnswer) ||
            correctAnswer < 0 ||
            correctAnswer >= question.options.length
        ) {
            throw new ApiError(
                400,
                `Question ${i + 1} has an invalid correct answer.`
            );
        }

        if (
            question.points !== undefined &&
            Number(question.points) < 1
        ) {
            throw new ApiError(
                400,
                `Question ${i + 1} must have at least 1 point.`
            );
        }
    }

    if (
        quiz.passingScore !== undefined &&
        (
            Number(quiz.passingScore) < 0 ||
            Number(quiz.passingScore) > 100
        )
    ) {
        throw new ApiError(
            400,
            "Passing score must be between 0 and 100."
        );
    }

    if (
        quiz.maxAttempts !== undefined &&
        Number(quiz.maxAttempts) < 1
    ) {
        throw new ApiError(
            400,
            "Maximum attempts must be at least 1."
        );
    }
};

/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

const createLesson = async (
    lessonData,
    files,
    user
) => {
    const topic = await Topic.findOne({
        _id: lessonData.topic,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    await assertCurriculumOwnership(
        "topic",
        topic._id,
        user
    );

    if (!lessonData.position) {
        const lastLesson = await Lesson.findOne({
            topic: topic._id,
        }).sort({
            position: -1,
        });

        lessonData.position = lastLesson
            ? lastLesson.position + 1
            : 1;
    }

    const existingPosition = await Lesson.findOne({
        topic: topic._id,
        position: lessonData.position,
    });

    if (existingPosition) {
        throw new ApiError(
            409,
            existingPosition.isDeleted
                ? "Position is held by a deleted item. Choose another position."
                : "Position already exists."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Video
    |--------------------------------------------------------------------------
    */

    let video = {
        type: "youtube",
        url: "",
        duration: 0,
        thumbnail: "",
    };

    /*
    |--------------------------------------------------------------------------
    | YouTube Video
    |--------------------------------------------------------------------------
    */

    if (
        lessonData.video?.type === "youtube" &&
        lessonData.video?.url
    ) {
        const thumbnail =
            getYouTubeThumbnail(
                lessonData.video.url
            );

        video = {
            type: "youtube",
            url: lessonData.video.url,
            duration: Number(
                lessonData.video.duration || 0
            ),
            thumbnail:
                thumbnail ||
                lessonData.video.thumbnail ||
                "",
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Uploaded Video
    |--------------------------------------------------------------------------
    */

    if (
        lessonData.video?.type === "upload" &&
        files?.video?.[0]
    ) {
        const uploadedVideo =
            await uploadToCloudinary(
                files.video[0].buffer,
                {
                    folder:
                        "acem-academy/lessons/videos",
                    resource_type: "video",
                }
            );

        video = {
            type: "upload",
            url: uploadedVideo.secure_url,
            duration:
                uploadedVideo.duration || 0,
            thumbnail: "",
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Attachments
    |--------------------------------------------------------------------------
    */

    let attachments = [];

    if (files?.attachments?.length) {
        attachments = await Promise.all(
            files.attachments.map(
                async (file) => {
                    const uploadedFile =
                        await uploadToCloudinary(
                            file.buffer,
                            {
                                folder:
                                    "acem-academy/lessons/attachments",
                                resource_type:
                                    "raw",
                            }
                        );

                    return {
                        title:
                            file.originalname,
                        url:
                            uploadedFile.secure_url,
                        fileType:
                            file.mimetype,
                    };
                }
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Quiz
    |--------------------------------------------------------------------------
    */

    if (lessonData.quiz) {
        validateQuiz(lessonData.quiz);
    }

    /*
    |--------------------------------------------------------------------------
    | Create Lesson
    |--------------------------------------------------------------------------
    */

    const lesson = await Lesson.create({
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        topic: lessonData.topic,
        position: lessonData.position,
        isPreview: lessonData.isPreview,
        video,
        attachments,
        quiz: lessonData.quiz || null,
        createdBy: user._id,
        updatedBy: user._id,
    });

    return lesson;
};

/*
|--------------------------------------------------------------------------
| Student Response Shaping
|--------------------------------------------------------------------------
|
| The answer key must never reach a student response: scoring happens on
| the server through the quiz submit endpoint.
|
| Teachers and admins keep the full quiz object because the lesson editor
| and curriculum screens edit correctAnswer / explanation.
|
*/

const shapeLessonForUser = (lesson, user) => {

    if (!lesson) {
        return lesson;
    }

    if (
        user &&
        (
            user.role === ROLES.TEACHER ||
            user.role === ROLES.ADMIN
        )
    ) {
        return lesson;
    }

    const shaped =
        typeof lesson.toObject === "function"
            ? lesson.toObject()
            : { ...lesson };

    if (
        !shaped.quiz ||
        !Array.isArray(shaped.quiz.questions)
    ) {
        return shaped;
    }

    shaped.quiz = {
        ...shaped.quiz,
        questions: shaped.quiz.questions.map(
            (question) => {
                const safeQuestion = {
                    ...question,
                };

                delete safeQuestion.correctAnswer;
                delete safeQuestion.explanation;

                return safeQuestion;
            }
        ),
    };

    return shaped;
};

/*
|--------------------------------------------------------------------------
| Syllabus-Only Lesson Shape
|--------------------------------------------------------------------------
|
| Returned for lessons the requesting student is not enrolled in:
| the syllabus stays visible (title / description / position) but the
| learning payload (content, video, attachments, quiz) is never sent.
|
*/

const shapeLessonSyllabus = (lesson) => {

    if (!lesson) {
        return lesson;
    }

    const source =
        typeof lesson.toObject === "function"
            ? lesson.toObject()
            : { ...lesson };

    return {
        _id: source._id,
        title: source.title,
        description: source.description,
        position: source.position,
        status: source.status,
        isPreview: source.isPreview,
        topic: source.topic,
    };
};

/*
|--------------------------------------------------------------------------
| Resolve Topic -> Course Map
|--------------------------------------------------------------------------
|
| Walks the same curriculum chain used by the C4 read check:
|
|   lesson.topic -> topic.chapter -> chapter.subCourse -> subCourse.course
|
| Uses batched queries (no per-lesson lookups) and returns a
| Map<topicIdString, courseIdString>.
|
*/

const resolveTopicCourseMap = async (lessons) => {

    const map = new Map();

    const topicIds = [
        ...new Set(
            lessons
                .map((lesson) =>
                    lesson.topic
                        ? lesson.topic._id || lesson.topic
                        : null
                )
                .filter(Boolean)
                .map((id) => id.toString())
        ),
    ];

    if (topicIds.length === 0) {
        return map;
    }

    const topics = await Topic.find({
        _id: { $in: topicIds },
    }).select("chapter");

    const chapterIds = [
        ...new Set(
            topics
                .map((topic) => topic.chapter)
                .filter(Boolean)
                .map((id) => id.toString())
        ),
    ];

    if (chapterIds.length === 0) {
        return map;
    }

    const chapters = await Chapter.find({
        _id: { $in: chapterIds },
    }).select("subCourse");

    const subCourseIds = [
        ...new Set(
            chapters
                .map((chapter) => chapter.subCourse)
                .filter(Boolean)
                .map((id) => id.toString())
        ),
    ];

    if (subCourseIds.length === 0) {
        return map;
    }

    const subCourses = await SubCourse.find({
        _id: { $in: subCourseIds },
    }).select("course");

    const chapterSubCourseMap = new Map(
        chapters.map((chapter) => [
            chapter._id.toString(),
            chapter.subCourse
                ? chapter.subCourse.toString()
                : null,
        ])
    );

    const subCourseCourseMap = new Map(
        subCourses.map((subCourse) => [
            subCourse._id.toString(),
            subCourse.course
                ? subCourse.course.toString()
                : null,
        ])
    );

    for (const topic of topics) {

        const chapterId = topic.chapter
            ? topic.chapter.toString()
            : null;

        const subCourseId = chapterId
            ? chapterSubCourseMap.get(chapterId)
            : null;

        const courseId = subCourseId
            ? subCourseCourseMap.get(subCourseId)
            : null;

        if (courseId) {
            map.set(topic._id.toString(), courseId);
        }
    }

    return map;
};

/*
|--------------------------------------------------------------------------
| Enrolled Course Ids
|--------------------------------------------------------------------------
|
| Same enrollment rule as the C4 by-id read check: every enrollment
| whose status is NOT cancelled grants access.
|
*/

const getEnrolledCourseIds = async (user) => {

    const enrollments = await Enrollment.find({
        student: user._id,
        status: {
            $ne: ENROLLMENT_STATUS.CANCELLED,
        },
    }).select("course");

    return new Set(
        enrollments.map((enrollment) =>
            enrollment.course.toString()
        )
    );
};

/*
|--------------------------------------------------------------------------
| Get Lessons
|--------------------------------------------------------------------------
*/

const getLessons = async (topicId, user) => {
    const filter = {
        isDeleted: false,
    };

    if (topicId) {
        filter.topic = topicId;
    }

    const lessons = await Lesson.find(filter)
        .populate(
            "topic",
            "title"
        )
        .sort({
            position: 1,
        });

    /*
    | Admin has full access.
    */

    if (user && user.role === ROLES.ADMIN) {
        return lessons.map((lesson) =>
            shapeLessonForUser(lesson, user)
        );
    }

    /*
    | Teachers: scoped to courses they own.
    */

    if (user && user.role === ROLES.TEACHER) {
        const topicCourseMap =
            await resolveTopicCourseMap(lessons);

        const ownedCourses = await SubCourse.find().populate(
            "course",
            "teacher"
        );

        const ownedCourseIds = new Set();

        for (const sc of ownedCourses) {
            const course = sc.course;
            if (course && course.teacher &&
                course.teacher.toString() === user._id.toString()) {
                ownedCourseIds.add(sc.course._id.toString());
            }
        }

        const teacherCourses = await require("../models/course.model")
            .find({ teacher: user._id })
            .select("_id");

        for (const c of teacherCourses) {
            ownedCourseIds.add(c._id.toString());
        }

        const scopedLessons = lessons.filter((lesson) => {
            const topicKey = lesson.topic
                ? (lesson.topic._id || lesson.topic).toString()
                : null;
            const courseId = topicKey
                ? topicCourseMap.get(topicKey)
                : null;
            return courseId && ownedCourseIds.has(courseId);
        });

        return scopedLessons.map((lesson) =>
            shapeLessonForUser(lesson, user)
        );
    }

    /*
    | Non-student non-admin non-teacher: keep previous behavior
    | as full data (backwards compatibility).
    */

    if (!user || user.role !== ROLES.STUDENT) {
        return lessons.map((lesson) =>
            shapeLessonForUser(lesson, user)
        );
    }

    /*
    | Students: full lesson data only for courses they are
    | enrolled in. Everyone else gets syllabus metadata, and
    | only for published lessons.
    |
    | A lesson is only visible to a student when the lesson is
    | published AND its topic (and the whole ancestor chain) is
    | published: a published lesson under a draft chapter must
    | not leak.
    */

    const publishedTopicIds =
        await getPublishedTopicIds(
            lessons.map((lesson) =>
                lesson.topic
                    ? lesson.topic._id || lesson.topic
                    : null
            )
        );

    const topicCourseMap =
        await resolveTopicCourseMap(lessons);

    const enrolledCourseIds =
        await getEnrolledCourseIds(user);

    return lessons.reduce((result, lesson) => {

        const topicKey = lesson.topic
            ? (lesson.topic._id || lesson.topic).toString()
            : null;

        const isVisible =
            topicKey &&
            lesson.status === LESSON_STATUS.PUBLISHED &&
            publishedTopicIds.has(topicKey);

        if (!isVisible) {
            return result;
        }

        const courseId = topicCourseMap.get(topicKey);

        const hasAccess =
            courseId !== null &&
            courseId !== undefined &&
            enrolledCourseIds.has(courseId);

        if (hasAccess) {
            result.push(
                shapeLessonForUser(lesson, user)
            );
            return result;
        }

        result.push(shapeLessonSyllabus(lesson));

        return result;
    }, []);
};

/*
|--------------------------------------------------------------------------
| Get Lesson By Id
|--------------------------------------------------------------------------
*/

const getLessonById = async (lessonId, user) => {
    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    }).populate(
        "topic",
        "title"
    );

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    /*
    | Students must not reach a lesson that is unpublished or that sits
    | under an unpublished ancestor, even with a direct lesson id.
    */

    if (
        isStudent(user) &&
        !(await isLessonPublishedForStudent(lesson))
    ) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    await assertLessonReadAccess(
        "lesson",
        lessonId,
        user
    );

    return shapeLessonForUser(lesson, user);
};

/*
|--------------------------------------------------------------------------
| Quiz Attempt Limit
|--------------------------------------------------------------------------
|
| Attempt limiting follows the existing quiz schema (maxAttempts: Number,
| default 1, min 1). A finite value >= 1 is an enforced limit; anything
| else (omitted, 0, null) means the quiz has no attempt limit.
|
*/

const MAX_ATTEMPT_INSERT_RETRIES = 10;

const getQuizAttemptLimit = (quiz) => {

    const raw = Number(quiz?.maxAttempts);

    if (Number.isFinite(raw) && raw >= 1) {
        return Math.floor(raw);
    }

    return null;
};

/*
|--------------------------------------------------------------------------
| Record Quiz Attempt
|--------------------------------------------------------------------------
|
| Persists an attempt and enforces maxAttempts without relying on
| multi-document transactions. attemptNumber is derived from the current
| attempt count and protected by a unique (student, lesson, attemptNumber)
| index, so two concurrent submissions can never both claim a slot:
| the loser hits a duplicate-key error, re-counts, and is rejected once
| the limit is reached.
|
*/

const recordQuizAttempt = async ({
    student,
    lessonId,
    limit,
    base,
}) => {

    for (
        let pass = 0;
        pass < MAX_ATTEMPT_INSERT_RETRIES;
        pass++
    ) {

        const used = await QuizAttempt.countDocuments({
            student,
            lesson: lessonId,
        });

        if (limit !== null && used >= limit) {
            throw new ApiError(
                403,
                "You have reached the maximum number of attempts for this quiz."
            );
        }

        try {
            return await QuizAttempt.create({
                ...base,
                attemptNumber: used + 1,
            });
        } catch (error) {

            /*
            | A concurrent submission inserted the same attemptNumber.
            | Re-count and retry; when the limit is reached the next pass
            | throws instead of inserting.
            */

            if (error && error.code === 11000) {
                continue;
            }

            throw error;
        }
    }

    throw new ApiError(
        409,
        "Could not record the quiz attempt due to concurrent submissions. Please try again."
    );
};

/*
|--------------------------------------------------------------------------
| Submit Quiz
|--------------------------------------------------------------------------
|
| Server-side scoring. The answer key stays in the database: only the
| calculated result is returned. Student attempts are persisted and
| maxAttempts is enforced server-side.
|
*/

const submitQuiz = async (
    lessonId,
    answers,
    user
) => {
    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    /*
    | Students must not submit a quiz for a lesson that is unpublished
    | or that sits under an unpublished ancestor.
    */

    if (
        isStudent(user) &&
        !(await isLessonPublishedForStudent(lesson))
    ) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    await assertLessonReadAccess(
        "lesson",
        lessonId,
        user
    );

    const quiz = lesson.quiz;

    if (
        !quiz ||
        !quiz.enabled ||
        !Array.isArray(quiz.questions) ||
        quiz.questions.length === 0
    ) {
        throw new ApiError(
            400,
            "This lesson does not have an active quiz."
        );
    }

    if (
        !Array.isArray(answers) ||
        answers.length !== quiz.questions.length
    ) {
        throw new ApiError(
            400,
            "Please answer every question before submitting."
        );
    }

    let earnedPoints = 0;
    let totalPoints = 0;

    quiz.questions.forEach(
        (question, index) => {
            const points =
                Number(question.points) > 0
                    ? Number(question.points)
                    : 1;

            totalPoints += points;

            if (
                Number(answers[index]) ===
                Number(question.correctAnswer)
            ) {
                earnedPoints += points;
            }
        }
    );

    const percentage =
        totalPoints > 0
            ? Math.round(
                (earnedPoints / totalPoints) * 100
            )
            : 0;

    const passingScore =
        quiz.passingScore !== undefined &&
        quiz.passingScore !== null
            ? Number(quiz.passingScore)
            : 70;

    const result = {
        earnedPoints,
        totalPoints,
        percentage,
        passed: percentage >= passingScore,
    };

    /*
    |--------------------------------------------------------------------------
    | Persist Attempt + Enforce maxAttempts
    |--------------------------------------------------------------------------
    |
    | Attempt persistence and the attempt limit apply to students. Teachers
    | and admins keep the previous score-only behavior.
    |
    */

    if (isStudent(user)) {

        const course = await resolveOwningCourse(
            "lesson",
            lesson._id
        );

        let courseId = null;
        let enrollmentId = null;

        if (course) {
            courseId = course._id;

            const enrollment = await Enrollment.findOne({
                student: user._id,
                course: course._id,
                status: {
                    $ne: ENROLLMENT_STATUS.CANCELLED,
                },
            }).select("_id");

            if (enrollment) {
                enrollmentId = enrollment._id;
            }
        }

        await recordQuizAttempt({
            student: user._id,
            lessonId: lesson._id,
            limit: getQuizAttemptLimit(quiz),
            base: {
                student: user._id,
                lesson: lesson._id,
                course: courseId,
                enrollment: enrollmentId,
                answers: answers.map(
                    (answer) => Number(answer)
                ),
                earnedPoints,
                totalPoints,
                percentage,
                passed: result.passed,
                submittedAt: new Date(),
            },
        });
    }

    return result;
};

/*
|--------------------------------------------------------------------------
| Update Lesson
|--------------------------------------------------------------------------
*/

const updateLesson = async (
    lessonId,
    updateData,
    files,
    user
) => {
    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    await assertCurriculumOwnership(
        "lesson",
        lessonId,
        user
    );

    /*
    |--------------------------------------------------------------------------
    | Position Validation
    |--------------------------------------------------------------------------
    */

    if (
        updateData.position !== undefined &&
        updateData.position !== "" &&
        Number(updateData.position) !==
            lesson.position
    ) {
        const existingPosition =
            await Lesson.findOne({
                topic: lesson.topic,
                position:
                    Number(updateData.position),
                isDeleted: false,
                _id: {
                    $ne: lessonId,
                },
            });

        if (existingPosition) {
            throw new ApiError(
                409,
                "Position already exists."
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Normal Lesson Fields
    |--------------------------------------------------------------------------
    */

    if (updateData.title !== undefined) {
        lesson.title = updateData.title;
    }

    if (
        updateData.description !==
        undefined
    ) {
        lesson.description =
            updateData.description;
    }

    if (updateData.content !== undefined) {
        lesson.content = updateData.content;
    }

    if (
        updateData.position !== undefined &&
        updateData.position !== ""
    ) {
        lesson.position = Number(
            updateData.position
        );
    }

    if (
        updateData.isPreview !== undefined
    ) {
        lesson.isPreview =
            updateData.isPreview === true ||
            updateData.isPreview === "true";
    }

    /*
    |--------------------------------------------------------------------------
    | YouTube Video Update
    |--------------------------------------------------------------------------
    */

    if (
        updateData.video?.type ===
            "youtube" &&
        updateData.video?.url
    ) {
        const thumbnail =
            getYouTubeThumbnail(
                updateData.video.url
            );

        lesson.video = {
            type: "youtube",
            url: updateData.video.url,
            duration: Number(
                updateData.video.duration || 0
            ),
            thumbnail:
                thumbnail ||
                updateData.video.thumbnail ||
                "",
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Uploaded Video Update
    |--------------------------------------------------------------------------
    */

    if (
        updateData.video?.type === "upload" &&
        files?.video?.length > 0
    ) {
        const videoFile =
            files.video[0];

        const uploadedVideo =
            await uploadToCloudinary(
                videoFile.buffer,
                {
                    folder:
                        "acem-academy/lessons/videos",
                    resource_type: "video",
                }
            );

        if (!uploadedVideo?.secure_url) {
            throw new ApiError(
                500,
                "Video upload failed."
            );
        }

        lesson.video = {
            type: "upload",
            url:
                uploadedVideo.secure_url,
            duration:
                uploadedVideo.duration || 0,
            thumbnail: "",
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Attachment Upload
    |--------------------------------------------------------------------------
    */

    const newAttachments = [];

    if (
        files?.attachments &&
        Array.isArray(files.attachments) &&
        files.attachments.length > 0
    ) {
        for (
            const file of files.attachments
        ) {
            const uploadedFile =
                await uploadToCloudinary(
                    file.buffer,
                    {
                        folder:
                            "acem-academy/lessons/attachments",
                        resource_type:
                            "raw",
                    }
                );

            if (
                !uploadedFile?.secure_url
            ) {
                throw new ApiError(
                    500,
                    `Failed to upload ${file.originalname}.`
                );
            }

            newAttachments.push({
                title:
                    file.originalname,
                url:
                    uploadedFile.secure_url,
                fileType:
                    file.mimetype,
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Keep Remaining Existing Attachments + Add New
    |--------------------------------------------------------------------------
    |
    | The editor sends the attachments that are still attached via
    | existingAttachments. Only entries that already belong to this
    | lesson are kept (so the list cannot be spoofed) and removed
    | attachments are dropped.
    |
    */

    if (
        updateData.existingAttachments !== undefined ||
        newAttachments.length > 0
    ) {
        let keptAttachments =
            lesson.attachments || [];

        if (
            Array.isArray(
                updateData.existingAttachments
            )
        ) {
            const existingUrls = new Set(
                (lesson.attachments || []).map(
                    (attachment) => attachment.url
                )
            );

            keptAttachments =
                updateData.existingAttachments.filter(
                    (attachment) =>
                        attachment &&
                        existingUrls.has(attachment.url)
                );
        }

        lesson.attachments = [
            ...keptAttachments,
            ...newAttachments,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Quiz Update
    |--------------------------------------------------------------------------
    */

    if (updateData.quiz !== undefined) {
        validateQuiz(updateData.quiz);

        lesson.quiz =
            updateData.quiz;
    }

    /*
    |--------------------------------------------------------------------------
    | Audit
    |--------------------------------------------------------------------------
    */

    lesson.updatedBy = user._id;

    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    */

    await lesson.save();

    /*
    |--------------------------------------------------------------------------
    | Return Fresh Lesson
    |--------------------------------------------------------------------------
    */

    const updatedLesson =
        await Lesson.findOne({
            _id: lessonId,
            isDeleted: false,
        }).populate(
            "topic",
            "title"
        );

    return updatedLesson;
};

/*
|--------------------------------------------------------------------------
| Delete Lesson
|--------------------------------------------------------------------------
*/

const deleteLesson = async (
    lessonId,
    user
) => {
    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    await assertCurriculumOwnership(
        "lesson",
        lessonId,
        user
    );

    lesson.isDeleted = true;
    lesson.updatedBy = user._id;

    await lesson.save();
};

/*
|--------------------------------------------------------------------------
| Publish Lesson
|--------------------------------------------------------------------------
*/

const publishLesson = async (
    lessonId,
    body,
    user
) => {
    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    await assertCurriculumOwnership(
        "lesson",
        lessonId,
        user
    );

    lesson.status = body.status;
    lesson.updatedBy = user._id;

    await lesson.save();

    return lesson;
};

module.exports = {
    createLesson,
    getLessons,
    getLessonById,
    submitQuiz,
    updateLesson,
    deleteLesson,
    publishLesson,
};