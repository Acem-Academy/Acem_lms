const Lesson = require("../models/lesson.model");
const Topic = require("../models/topic.model");
const {
    uploadToCloudinary,
} = require("../utils/cloudinary");
const ApiError = require("../utils/ApiError");

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

    if (!lessonData.position) {
        const lastLesson = await Lesson.findOne({
            topic: topic._id,
            isDeleted: false,
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
        isDeleted: false,
    });

    if (existingPosition) {
        throw new ApiError(
            409,
            "Position already exists."
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
        ...lessonData,
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
| Get Lessons
|--------------------------------------------------------------------------
*/

const getLessons = async (topicId) => {
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

    return lessons;
};

/*
|--------------------------------------------------------------------------
| Get Lesson By Id
|--------------------------------------------------------------------------
*/

const getLessonById = async (lessonId) => {
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

    return lesson;
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

    if (
        files?.attachments &&
        Array.isArray(files.attachments) &&
        files.attachments.length > 0
    ) {
        const newAttachments = [];

        for (
            const file of files.attachments
        ) {
            console.log(
                "📎 Uploading attachment:",
                file.originalname
            );

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

        /*
        |--------------------------------------------------------------------------
        | Preserve Existing Attachments + Add New
        |--------------------------------------------------------------------------
        */

        lesson.attachments = [
            ...(lesson.attachments || []),
            ...newAttachments,
        ];

        console.log(
            "📎 Attachments before save:",
            lesson.attachments
        );
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

    console.log(
        "✅ Lesson saved. Attachments:",
        lesson.attachments
    );

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

    lesson.status = body.status;
    lesson.updatedBy = user._id;

    await lesson.save();

    return lesson;
};

module.exports = {
    createLesson,
    getLessons,
    getLessonById,
    updateLesson,
    deleteLesson,
    publishLesson,
};