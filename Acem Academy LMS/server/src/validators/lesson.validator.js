const { body, param } = require("express-validator");

const {
    LESSON_STATUS,
} = require("../constants/lesson.constants");

/*
|--------------------------------------------------------------------------
| YouTube URL Helper
|--------------------------------------------------------------------------
*/

const isYouTubeUrl = (value) => {
    if (!value) return true;

    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/.test(
        value
    );
};

/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

const createLessonValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Lesson title is required.")
        .bail()
        .isLength({ min: 3, max: 200 })
        .withMessage(
            "Lesson title must be between 3 and 200 characters."
        ),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 3000 })
        .withMessage(
            "Description cannot exceed 3000 characters."
        ),

    body("topic")
        .notEmpty()
        .withMessage("Topic is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid topic id."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage(
            "Position must be greater than 0."
        ),

    body("isPreview")
        .optional()
        .isBoolean()
        .withMessage(
            "isPreview must be a boolean."
        ),

    /*
    |--------------------------------------------------------------------------
    | Video Type
    |--------------------------------------------------------------------------
    */

    body("video.type")
        .optional()
        .isIn(["youtube", "upload"])
        .withMessage(
            "Video type must be either youtube or upload."
        ),

    /*
    |--------------------------------------------------------------------------
    | Video URL
    |--------------------------------------------------------------------------
    */

    body("video.url")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video URL."
        )
        .bail()
        .custom((value, { req }) => {

            if (
                req.body.video?.type === "youtube" &&
                !isYouTubeUrl(value)
            ) {
                throw new Error(
                    "Please provide a valid YouTube video URL."
                );
            }

            return true;
        }),

    /*
    |--------------------------------------------------------------------------
    | Video Duration
    |--------------------------------------------------------------------------
    */

    body("video.duration")
        .optional()
        .isInt({ min: 0 })
        .withMessage(
            "Video duration must be a positive number."
        ),

    /*
    |--------------------------------------------------------------------------
    | Video Thumbnail
    |--------------------------------------------------------------------------
    */

    body("video.thumbnail")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video thumbnail URL."
        ),

/*
|--------------------------------------------------------------------------
| Quiz
|--------------------------------------------------------------------------
*/

body("quiz.enabled")
    .optional()
    .isBoolean()
    .withMessage("Quiz enabled must be a boolean."),

body("quiz.title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage(
        "Quiz title must be between 1 and 200 characters."
    ),

body("quiz.description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
        "Quiz description cannot exceed 2000 characters."
    ),

body("quiz.passingScore")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage(
        "Quiz passing score must be between 0 and 100."
    ),

body("quiz.maxAttempts")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
        "Quiz max attempts must be at least 1."
    ),

body("quiz.questions")
    .optional()
    .isArray()
    .withMessage(
        "Quiz questions must be an array."
    ),

body("quiz.questions.*.question")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
        "Question text is required."
    )
    .isLength({ max: 2000 })
    .withMessage(
        "Question cannot exceed 2000 characters."
    ),

body("quiz.questions.*.options")
    .optional()
    .isArray({ min: 2 })
    .withMessage(
        "Each question must have at least 2 options."
    ),

body("quiz.questions.*.options.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
        "Question options cannot be empty."
    ),

body("quiz.questions.*.correctAnswer")
    .optional()
    .isInt({ min: 0 })
    .withMessage(
        "Correct answer must be a valid option index."
    )
    .custom((value, { req, path }) => {
        const match = path.match(
            /quiz\.questions\.(\d+)\.correctAnswer/
        );

        if (!match) {
            return true;
        }

        const questionIndex = Number(
            match[1]
        );

        const question =
            req.body.quiz?.questions?.[
                questionIndex
            ];

        if (!question) {
            return true;
        }

        const options = question.options;

        if (
            Array.isArray(options) &&
            Number(value) >= options.length
        ) {
            throw new Error(
                "Correct answer must point to an existing option."
            );
        }

        return true;
    }),

body("quiz.questions.*.points")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
        "Question points must be at least 1."
    ),

body("quiz.questions.*.explanation")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
        "Question explanation cannot exceed 2000 characters."
    ),

];

/*
|--------------------------------------------------------------------------
| Update Lesson
|--------------------------------------------------------------------------
*/

const updateLessonValidator = [

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage(
            "Lesson title must be between 3 and 200 characters."
        ),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 3000 })
        .withMessage(
            "Description cannot exceed 3000 characters."
        ),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage(
            "Position must be greater than 0."
        ),

    body("isPreview")
        .optional()
        .isBoolean()
        .withMessage(
            "isPreview must be a boolean."
        ),

    /*
    |--------------------------------------------------------------------------
    | Video Type
    |--------------------------------------------------------------------------
    */

    body("video.type")
        .optional()
        .isIn(["youtube", "upload"])
        .withMessage(
            "Video type must be either youtube or upload."
        ),

    /*
    |--------------------------------------------------------------------------
    | Video URL
    |--------------------------------------------------------------------------
    */

    body("video.url")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video URL."
        )
        .bail()
        .custom((value, { req }) => {

            if (
                req.body.video?.type === "youtube" &&
                !isYouTubeUrl(value)
            ) {
                throw new Error(
                    "Please provide a valid YouTube video URL."
                );
            }

            return true;
        }),

    /*
    |--------------------------------------------------------------------------
    | Video Duration
    |--------------------------------------------------------------------------
    */

    body("video.duration")
        .optional()
        .isInt({ min: 0 })
        .withMessage(
            "Video duration must be a positive number."
        ),

    /*
    |--------------------------------------------------------------------------
    | Video Thumbnail
    |--------------------------------------------------------------------------
    */

    body("video.thumbnail")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video thumbnail URL."
        ),


/*
|--------------------------------------------------------------------------
| Quiz
|--------------------------------------------------------------------------
*/

body("quiz.enabled")
    .optional()
    .isBoolean()
    .withMessage("Quiz enabled must be a boolean."),

body("quiz.title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage(
        "Quiz title must be between 1 and 200 characters."
    ),

body("quiz.description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
        "Quiz description cannot exceed 2000 characters."
    ),

body("quiz.passingScore")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage(
        "Quiz passing score must be between 0 and 100."
    ),

body("quiz.maxAttempts")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
        "Quiz max attempts must be at least 1."
    ),

body("quiz.questions")
    .optional()
    .isArray()
    .withMessage(
        "Quiz questions must be an array."
    ),

body("quiz.questions.*.question")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
        "Question text is required."
    )
    .isLength({ max: 2000 })
    .withMessage(
        "Question cannot exceed 2000 characters."
    ),

body("quiz.questions.*.options")
    .optional()
    .isArray({ min: 2 })
    .withMessage(
        "Each question must have at least 2 options."
    ),

body("quiz.questions.*.options.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
        "Question options cannot be empty."
    ),

body("quiz.questions.*.correctAnswer")
    .optional()
    .isInt({ min: 0 })
    .withMessage(
        "Correct answer must be a valid option index."
    )
    .custom((value, { req, path }) => {
        const match = path.match(
            /quiz\.questions\.(\d+)\.correctAnswer/
        );

        if (!match) {
            return true;
        }

        const questionIndex = Number(
            match[1]
        );

        const question =
            req.body.quiz?.questions?.[
                questionIndex
            ];

        if (!question) {
            return true;
        }

        const options = question.options;

        if (
            Array.isArray(options) &&
            Number(value) >= options.length
        ) {
            throw new Error(
                "Correct answer must point to an existing option."
            );
        }

        return true;
    }),

body("quiz.questions.*.points")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
        "Question points must be at least 1."
    ),

body("quiz.questions.*.explanation")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
        "Question explanation cannot exceed 2000 characters."
    ),

];

/*
|--------------------------------------------------------------------------
| Lesson Id
|--------------------------------------------------------------------------
*/

const lessonIdValidator = [

    param("lessonId")
        .isMongoId()
        .withMessage(
            "Invalid lesson id."
        ),
];

/*
|--------------------------------------------------------------------------
| Publish Lesson
|--------------------------------------------------------------------------
*/

const publishLessonValidator = [

    body("status")
        .isIn(Object.values(LESSON_STATUS))
        .withMessage(
            "Invalid lesson status."
        ),
];

module.exports = {
    createLessonValidator,
    updateLessonValidator,
    lessonIdValidator,
    publishLessonValidator,
};