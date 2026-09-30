import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";
import {
    BookOpen,
    FileText,
    ExternalLink,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock3,
    PlayCircle,
    Loader2,
    Menu,
    X,
    ArrowLeft,
    ArrowRight,
    Trophy,
    RotateCcw,
    Circle,
    Check,
} from "lucide-react";

import {
    getEnrollmentById,
    startLesson,
    completeLesson,
} from "@/api/enrollment.api";

import {
    getSubCourses,
    getChapters,
    getTopics,
    getLessons,
} from "@/api/curriculum.api";

import MathText from "@/components/forms/MathText";


/*
|--------------------------------------------------------------------------
| Dark-Background Color Repair
|--------------------------------------------------------------------------
|
| The teacher's editor has a WHITE page, so a color like near-black or a
| dark red reads fine there. This page has a BLACK background, so those
| exact same colors go invisible. Blanket-forcing every color to one flat
| gray (the previous approach) "fixed" that but also erased colors the
| teacher genuinely chose on purpose (a red heading, blue emphasis, etc).
|
| The correct fix: only touch colors that actually fail contrast against
| black, and lighten THOSE while preserving their hue - so a barely-legible
| dark red becomes a legible red (not gray), while a normal light or
| already-bright color (including default text) is left completely alone.
|
*/

const hexToRgb = (hex) => {
    const clean = hex.replace("#", "");
    const full = clean.length === 3
        ? clean.split("").map((c) => c + c).join("")
        : clean;
    if (full.length !== 6) return null;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const parseCssColor = (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("#")) return hexToRgb(trimmed);
    const match = trimmed.match(/rgba?\(([^)]+)\)/i);
    if (match) {
        const parts = match[1].split(",").map((part) => parseFloat(part.trim()));
        if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
            return { r: parts[0], g: parts[1], b: parts[2] };
        }
    }
    return null;
};

const relativeLuminance = ({ r, g, b }) => {
    const channel = (c) => {
        const normalized = c / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const rgbToHsl = ({ r, g, b }) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
            case gn: h = (bn - rn) / d + 2; break;
            default: h = (rn - gn) / d + 4; break;
        }
        h /= 6;
    }

    return { h, s, l };
};

const hslToCss = ({ h, s, l }) =>
    `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

// WCAG AA (4.5:1) against a near-black background needs text luminance
// of roughly 0.175+; anything under that is what was going invisible.
const MIN_READABLE_LUMINANCE = 0.18;
const REPAIRED_LIGHTNESS = 0.72;

const ensureReadableOnDarkBackground = (rootEl) => {
    if (!rootEl) return;

    const colored = rootEl.querySelectorAll("[style*='color']");

    colored.forEach((el) => {
        const rgb = parseCssColor(el.style.color);
        if (!rgb) return;

        if (relativeLuminance(rgb) < MIN_READABLE_LUMINANCE) {
            const hsl = rgbToHsl(rgb);
            // Genuinely neutral (near-grayscale) colors - typically an
            // editor's default "black" text - just become light gray.
            // Anything with real saturation (a chosen red, blue, etc.)
            // keeps its hue, just brightened enough to read.
            hsl.l = REPAIRED_LIGHTNESS;
            if (hsl.s < 0.08) hsl.s = 0;
            el.style.color = hslToCss(hsl);
        }
    });
};


const getYouTubeVideoId = (url) => {
    if (!url) return "";

    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/
    );

    return match?.[1] || "";
};


/*
|--------------------------------------------------------------------------
| Lesson Content Normalization
|--------------------------------------------------------------------------
|
| Mirrors the same helpers in the teacher-side LessonEditor.jsx, so a
| lesson saved from either the old Quill editor or the current Tiptap
| editor renders identically here. Kept in sync manually for now - if
| this drifts, consider extracting both copies into a shared
| @/utils/lessonContent.js module.
|
*/

const quillDeltaToTiptap = (delta) => {
    const ops = Array.isArray(delta?.ops) ? delta.ops : [];
    const lines = [];
    let inline = [];
    let blockAttrs = {};

    const marksFromQuill = (attrs = {}) => {
        const marks = [];
        if (attrs.bold) marks.push({ type: "bold" });
        if (attrs.italic) marks.push({ type: "italic" });
        if (attrs.underline) marks.push({ type: "underline" });
        if (attrs.strike) marks.push({ type: "strike" });
        if (attrs.script === "sub") marks.push({ type: "subscript" });
        if (attrs.script === "super") marks.push({ type: "superscript" });
        if (attrs.link) marks.push({ type: "link", attrs: { href: attrs.link } });
        if (attrs.color) marks.push({ type: "textStyle", attrs: { color: attrs.color } });
        if (attrs.background) marks.push({ type: "highlight", attrs: { color: attrs.background } });
        return marks;
    };

    const pushLine = () => {
        lines.push({
            content: inline.length ? inline : undefined,
            attrs: blockAttrs,
        });
        inline = [];
        blockAttrs = {};
    };

    for (const op of ops) {
        const attrs = op.attributes || {};

        if (typeof op.insert === "object" && op.insert !== null) {
            if (op.insert.formula) {
                inline.push({ type: "inlineMath", attrs: { latex: String(op.insert.formula) } });
            } else if (op.insert.image) {
                inline.push({ type: "image", attrs: { src: String(op.insert.image) } });
            }
            continue;
        }

        if (typeof op.insert !== "string") continue;

        const parts = op.insert.split("\n");
        parts.forEach((part, index) => {
            if (part) {
                const marks = marksFromQuill(attrs);
                inline.push({
                    type: "text",
                    text: part,
                    ...(marks.length ? { marks } : {}),
                });
            }

            if (index < parts.length - 1) {
                blockAttrs = { ...attrs };
                pushLine();
            }
        });
    }

    if (inline.length || !lines.length) pushLine();

    const content = [];
    let list = null;

    const flushList = () => {
        if (list) {
            content.push(list);
            list = null;
        }
    };

    lines.forEach((line) => {
        const attrs = line.attrs || {};
        const listType = attrs.list === "ordered" ? "orderedList" : attrs.list === "bullet" ? "bulletList" : null;

        let node;
        if (attrs.header) {
            node = { type: "heading", attrs: { level: Number(attrs.header), textAlign: attrs.align || null }, ...(line.content ? { content: line.content } : {}) };
        } else if (attrs.blockquote) {
            node = { type: "blockquote", content: [{ type: "paragraph", attrs: { textAlign: attrs.align || null }, ...(line.content ? { content: line.content } : {}) }] };
        } else if (attrs["code-block"]) {
            node = { type: "codeBlock", ...(line.content ? { content: line.content } : {}) };
        } else {
            node = { type: "paragraph", attrs: { textAlign: attrs.align || null }, ...(line.content ? { content: line.content } : {}) };
        }

        if (listType) {
            if (!list || list.type !== listType) {
                flushList();
                list = { type: listType, content: [] };
            }
            list.content.push({ type: "listItem", content: [node.type === "paragraph" ? node : { type: "paragraph", ...(line.content ? { content: line.content } : {}) }] });
        } else {
            flushList();
            content.push(node);
        }
    });

    flushList();
    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
};

const normalizeLessonContent = (content) => {
    if (!content) return "";
    if (content?.type === "doc") return content;

    if (Array.isArray(content?.ops)) return quillDeltaToTiptap(content);

    if (typeof content === "string") {
        try {
            const parsed = JSON.parse(content);
            if (parsed?.type === "doc") return parsed;
            if (Array.isArray(parsed?.ops)) return quillDeltaToTiptap(parsed);
        } catch {
            // Legacy HTML/plain text is passed directly to Tiptap.
        }
        return content;
    }

    return "";
};

const Learning = () => {

    const { enrollmentId } = useParams();
    const navigate = useNavigate();


    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [enrollment, setEnrollment] = useState(null);
    const [curriculum, setCurriculum] = useState([]);

    const [selectedLesson, setSelectedLesson] = useState(null);

    const [loading, setLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(true);

    const [actionLoading, setActionLoading] = useState(false);

    const [error, setError] = useState("");

    const [openSubCourses, setOpenSubCourses] = useState({});
    const [openChapters, setOpenChapters] = useState({});
    const [openTopics, setOpenTopics] = useState({});

    const [sidebarOpen, setSidebarOpen] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Quiz State
    |--------------------------------------------------------------------------
    */

    const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(null);

    // Used by the "Read Material" PDF viewer link target; was previously
    // referenced via setPdfZoom without ever being declared, which threw
    // a ReferenceError every time a lesson was selected.
    const [pdfZoom, setPdfZoom] = useState(0.9);


    /*
    |--------------------------------------------------------------------------
    | Lesson Content Renderer (read-only)
    |--------------------------------------------------------------------------
    |
    | Same extension set as the teacher's editor (including Mathematics),
    | just non-editable, so equations, formatting, images, etc. render
    | exactly as the teacher built them instead of dumping raw JSON.
    |
    */

    const contentEditorExtensions = useMemo(() => [
        StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: true }),
        Image,
        Subscript,
        Superscript,
        Mathematics.configure({
            katexOptions: { throwOnError: false },
        }),
    ], []);

    const contentEditor = useEditor({
        extensions: contentEditorExtensions,
        content: "",
        editable: false,
        immediatelyRender: false,
    });

    useEffect(() => {
        if (!contentEditor) return;

        const normalized = normalizeLessonContent(selectedLesson?.content);
        contentEditor.commands.setContent(normalized || "", { emitUpdate: false });

        // Repair only the colors that would actually go invisible on this
        // page's black background - everything else (the teacher's real
        // color choices) is left untouched.
        ensureReadableOnDarkBackground(contentEditor.view.dom);
    }, [contentEditor, selectedLesson?._id]);



    /*
    |--------------------------------------------------------------------------
    | Fetch Enrollment
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const fetchEnrollment = async () => {

            try {

                setLoading(true);
                setError("");

                const response =
                    await getEnrollmentById(enrollmentId);

                setEnrollment(response.data);

            } catch (error) {

                console.error(
                    "Failed to fetch enrollment:",
                    error
                );

                setError(
                    error?.response?.data?.message ||
                    "Unable to load your course."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchEnrollment();

    }, [enrollmentId]);


    /*
    |--------------------------------------------------------------------------
    | Fetch Curriculum
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        if (!enrollment?.course?._id) {
            return;
        }

        const fetchCurriculum = async () => {

            try {

                setCurriculumLoading(true);

                const [
                    subCourseResponse,
                    chapterResponse,
                    topicResponse,
                    lessonResponse,
                ] = await Promise.all([
                    getSubCourses(),
                    getChapters(),
                    getTopics(),
                    getLessons(),
                ]);

                const subCourses =
                    subCourseResponse.data || [];

                const chapters =
                    chapterResponse.data || [];

                const topics =
                    topicResponse.data || [];

                const lessons =
                    lessonResponse.data || [];

                const courseId =
                    enrollment.course._id;


                /*
                |--------------------------------------------------------------------------
                | Sub Courses
                |--------------------------------------------------------------------------
                */

                const courseSubCourses =
                    subCourses
                        .filter((subCourse) => {

                            const parentCourseId =
                                typeof subCourse.course === "object"
                                    ? subCourse.course?._id
                                    : subCourse.course;

                            return (
                                parentCourseId?.toString() ===
                                courseId.toString()
                            );

                        })
                        .sort(
                            (a, b) =>
                                a.position - b.position
                        );


                /*
                |--------------------------------------------------------------------------
                | Build Curriculum
                |--------------------------------------------------------------------------
                */

                const structuredCurriculum =
                    courseSubCourses.map(
                        (subCourse) => {

                            const subCourseChapters =
                                chapters
                                    .filter((chapter) => {

                                        const parentSubCourseId =
                                            typeof chapter.subCourse === "object"
                                                ? chapter.subCourse?._id
                                                : chapter.subCourse;

                                        return (
                                            parentSubCourseId?.toString() ===
                                            subCourse._id.toString()
                                        );

                                    })
                                    .sort(
                                        (a, b) =>
                                            a.position - b.position
                                    );


                            const structuredChapters =
                                subCourseChapters.map(
                                    (chapter) => {

                                        const chapterTopics =
                                            topics
                                                .filter((topic) => {

                                                    const parentChapterId =
                                                        typeof topic.chapter === "object"
                                                            ? topic.chapter?._id
                                                            : topic.chapter;

                                                    return (
                                                        parentChapterId?.toString() ===
                                                        chapter._id.toString()
                                                    );

                                                })
                                                .sort(
                                                    (a, b) =>
                                                        a.position - b.position
                                                );


                                        const structuredTopics =
                                            chapterTopics.map(
                                                (topic) => {

                                                    const topicLessons =
                                                        lessons
                                                            .filter((lesson) => {

                                                                const parentTopicId =
                                                                    typeof lesson.topic === "object"
                                                                        ? lesson.topic?._id
                                                                        : lesson.topic;

                                                                return (
                                                                    parentTopicId?.toString() ===
                                                                    topic._id.toString()
                                                                );

                                                            })
                                                            .sort(
                                                                (a, b) =>
                                                                    a.position - b.position
                                                            );

                                                    return {
                                                        ...topic,
                                                        lessons:
                                                            topicLessons,
                                                    };

                                                }
                                            );


                                        return {
                                            ...chapter,
                                            topics:
                                                structuredTopics,
                                        };

                                    }
                                );


                            return {
                                ...subCourse,
                                chapters:
                                    structuredChapters,
                            };

                        }
                    );


                setCurriculum(
                    structuredCurriculum
                );


                /*
                |--------------------------------------------------------------------------
                | Automatically Select Last Accessed Lesson
                |--------------------------------------------------------------------------
                */

                if (enrollment.lastAccessedLesson) {

                    const lastLessonId =
                        typeof enrollment.lastAccessedLesson === "object"
                            ? enrollment.lastAccessedLesson?._id
                            : enrollment.lastAccessedLesson;


                    for (
                        const subCourse
                        of structuredCurriculum
                    ) {

                        for (
                            const chapter
                            of subCourse.chapters
                        ) {

                            for (
                                const topic
                                of chapter.topics
                            ) {

                                const lesson =
                                    topic.lessons.find(
                                        (item) =>
                                            item._id.toString() ===
                                            lastLessonId.toString()
                                    );


                                if (lesson) {

                                    setSelectedLesson(
                                        lesson
                                    );

                                    setOpenSubCourses((prev) => ({
                                        ...prev,
                                        [subCourse._id]: true,
                                    }));

                                    setOpenChapters((prev) => ({
                                        ...prev,
                                        [chapter._id]: true,
                                    }));

                                    setOpenTopics((prev) => ({
                                        ...prev,
                                        [topic._id]: true,
                                    }));

                                    return;

                                }

                            }

                        }

                    }

                }


                /*
                |--------------------------------------------------------------------------
                | Select First Lesson
                |--------------------------------------------------------------------------
                */

                for (
                    const subCourse
                    of structuredCurriculum
                ) {

                    for (
                        const chapter
                        of subCourse.chapters
                    ) {

                        for (
                            const topic
                            of chapter.topics
                        ) {

                            if (
                                topic.lessons.length > 0
                            ) {

                                setSelectedLesson(
                                    topic.lessons[0]
                                );

                                setOpenSubCourses((prev) => ({
                                    ...prev,
                                    [subCourse._id]: true,
                                }));

                                setOpenChapters((prev) => ({
                                    ...prev,
                                    [chapter._id]: true,
                                }));

                                setOpenTopics((prev) => ({
                                    ...prev,
                                    [topic._id]: true,
                                }));

                                return;

                            }

                        }

                    }

                }

            } catch (error) {

                console.error(
                    "Failed to fetch curriculum:",
                    error
                );

            } finally {

                setCurriculumLoading(false);

            }

        };

        fetchCurriculum();

    }, [enrollment]);


    /*
    |--------------------------------------------------------------------------
    | Completed Lesson Check
    |--------------------------------------------------------------------------
    */

    const isLessonCompleted = (
        lessonId
    ) => {

        return (
            enrollment?.completedLessons?.some(
                (completedLesson) => {

                    const id =
                        typeof completedLesson === "object"
                            ? completedLesson?._id
                            : completedLesson;

                    return (
                        id?.toString() ===
                        lessonId?.toString()
                    );

                }
            ) || false
        );

    };


    /*
    |--------------------------------------------------------------------------
    | Flatten Lessons
    |--------------------------------------------------------------------------
    */

    const allLessons = useMemo(() => {

        const lessons = [];

        curriculum.forEach((subCourse) => {

            subCourse.chapters?.forEach((chapter) => {

                chapter.topics?.forEach((topic) => {

                    topic.lessons?.forEach((lesson) => {

                        lessons.push(lesson);

                    });

                });

            });

        });

        return lessons;

    }, [curriculum]);


    /*
    |--------------------------------------------------------------------------
    | Current Lesson Navigation
    |--------------------------------------------------------------------------
    */

    const currentLessonIndex =
        selectedLesson
            ? allLessons.findIndex(
                (lesson) =>
                    lesson._id === selectedLesson._id
            )
            : -1;


    const previousLesson =
        currentLessonIndex > 0
            ? allLessons[currentLessonIndex - 1]
            : null;


    const nextLesson =
        currentLessonIndex >= 0 &&
        currentLessonIndex < allLessons.length - 1
            ? allLessons[currentLessonIndex + 1]
            : null;


    /*
    |--------------------------------------------------------------------------
    | Select Lesson
    |--------------------------------------------------------------------------
    */

    const handleSelectLesson = async (
        lesson
    ) => {

        setSelectedLesson(
            lesson
        );

        setQuizQuestionIndex(0);
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);

        setPdfZoom(0.9);

        setSidebarOpen(false);


        if (
            !enrollment ||
            isLessonCompleted(
                lesson._id
            )
        ) {
            return;
        }


        try {

            setActionLoading(true);

            const response =
                await startLesson(
                    enrollment._id,
                    lesson._id
                );

            setEnrollment(
                response.data.enrollment
            );

        } catch (error) {

            console.error(
                "Failed to start lesson:",
                error
            );

        } finally {

            setActionLoading(false);

        }

    };



    /*
    |--------------------------------------------------------------------------
    | Quiz Helpers
    |--------------------------------------------------------------------------
    */

    const quizQuestions =
        selectedLesson?.quiz?.enabled &&
        Array.isArray(selectedLesson?.quiz?.questions)
            ? selectedLesson.quiz.questions
            : [];

    const currentQuizQuestion =
        quizQuestions[quizQuestionIndex] || null;

    const handleQuizAnswer = (optionIndex) => {
        if (quizSubmitted || !currentQuizQuestion) {
            return;
        }

        setQuizAnswers((prev) => ({
            ...prev,
            [quizQuestionIndex]: optionIndex,
        }));
    };

    const handleQuizNext = () => {
        if (quizQuestionIndex >= quizQuestions.length - 1) {
            return;
        }

        if (typeof quizAnswers[quizQuestionIndex] !== "number") {
            return;
        }

        setQuizQuestionIndex((prev) => prev + 1);
    };

    const handleQuizPrevious = () => {
        if (quizQuestionIndex <= 0) {
            return;
        }

        setQuizQuestionIndex((prev) => prev - 1);
    };

    const handleQuizSubmit = () => {
        if (!quizQuestions.length) {
            return;
        }

        const unanswered = quizQuestions.some(
            (_, index) => typeof quizAnswers[index] !== "number"
        );

        if (unanswered) {
            return;
        }

        let earnedPoints = 0;
        let totalPoints = 0;

        quizQuestions.forEach((question, index) => {
            const points = Number(question.points) > 0 ? Number(question.points) : 1;
            totalPoints += points;

            if (Number(quizAnswers[index]) === Number(question.correctAnswer)) {
                earnedPoints += points;
            }
        });

        const percentage =
            totalPoints > 0
                ? Math.round((earnedPoints / totalPoints) * 100)
                : 0;

        setQuizScore({
            earnedPoints,
            totalPoints,
            percentage,
            passed:
                percentage >= Number(selectedLesson.quiz.passingScore ?? 70),
        });

        setQuizSubmitted(true);
    };

    const handleQuizReset = () => {
        setQuizQuestionIndex(0);
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
    };

    /*
    |--------------------------------------------------------------------------
    | Complete Lesson
    |--------------------------------------------------------------------------
    */

    const handleCompleteLesson = async () => {

        if (
            !selectedLesson ||
            !enrollment ||
            selectedLessonCompleted
        ) {
            return;
        }


        try {

            setActionLoading(true);

            const response =
                await completeLesson(
                    enrollment._id,
                    selectedLesson._id
                );

            setEnrollment(
                response.data
            );

        } catch (error) {

            console.error(
                "Failed to complete lesson:",
                error
            );

        } finally {

            setActionLoading(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Lesson Navigation
    |--------------------------------------------------------------------------
    */

    const handlePreviousLesson = () => {

        if (previousLesson) {

            handleSelectLesson(
                previousLesson
            );

        }

    };


    const handleNextLesson = () => {

        if (nextLesson) {

            handleSelectLesson(
                nextLesson
            );

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Toggle Functions
    |--------------------------------------------------------------------------
    */

    const toggleSubCourse = (
        id
    ) => {

        setOpenSubCourses(
            (prev) => ({
                ...prev,
                [id]: !prev[id],
            })
        );

    };


    const toggleChapter = (
        id
    ) => {

        setOpenChapters(
            (prev) => ({
                ...prev,
                [id]: !prev[id],
            })
        );

    };


    const toggleTopic = (
        id
    ) => {

        setOpenTopics(
            (prev) => ({
                ...prev,
                [id]: !prev[id],
            })
        );

    };


    /*
    |--------------------------------------------------------------------------
    | Total Lessons
    |--------------------------------------------------------------------------
    */

    const totalLessons = useMemo(() => {

        return curriculum.reduce(
            (
                total,
                subCourse
            ) => {

                return (
                    total +
                    subCourse.chapters.reduce(
                        (
                            chapterTotal,
                            chapter
                        ) => {

                            return (
                                chapterTotal +
                                chapter.topics.reduce(
                                    (
                                        topicTotal,
                                        topic
                                    ) =>
                                        topicTotal +
                                        topic.lessons.length,
                                    0
                                )
                            );

                        },
                        0
                    )
                );

            },
            0
        );

    }, [curriculum]);


    /*
    |--------------------------------------------------------------------------
    | Completed Lessons
    |--------------------------------------------------------------------------
    */

    const completedLessons =
        enrollment?.completedLessons?.length || 0;


    /*
    |--------------------------------------------------------------------------
    | Progress
    |--------------------------------------------------------------------------
    */

    const progress =
        Number(enrollment?.progress || 0);


    /*
    |--------------------------------------------------------------------------
    | Selected Lesson Completion
    |--------------------------------------------------------------------------
    */

    const selectedLessonCompleted =
        selectedLesson
            ? isLessonCompleted(
                selectedLesson._id
            )
            : false;


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {

        return (

            <div className="flex min-h-screen items-center justify-center bg-black">

                <div className="flex items-center gap-3 text-sm text-white">

                    <Loader2
                        size={18}
                        className="
                            animate-spin
                            text-[var(--color-primary)]
                        "
                    />

                    Loading your course...

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Error
    |--------------------------------------------------------------------------
    */

    if (
        error ||
        !enrollment
    ) {

        return (

            <div className="flex min-h-screen items-center justify-center bg-black px-6">

                <div
                    className="
                        rounded-xl
                        border
                        border-red-900
                        bg-red-950/30
                        px-6
                        py-5
                        text-sm
                        text-red-400
                    "
                >

                    {error ||
                        "Enrollment not found."}

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Sidebar Component
    |--------------------------------------------------------------------------
    */

    const CurriculumSidebar = () => (

        <div className="flex h-full flex-col">


            {/* Sidebar Header */}

            <div
                className="
                    border-b
                    border-[var(--color-border)]
                    bg-[var(--color-surface)]
                    px-5
                    py-5
                "
            >

                <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-[var(--color-primary)]/10
                            "
                        >

                            <BookOpen
                                size={20}
                                className="text-[var(--color-primary)]"
                            />

                        </div>


                        <div>

                            <h2 className="font-bold text-[var(--color-primary)]">
                                Course Content
                            </h2>

                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">

                                {completedLessons} of{" "}
                                {totalLessons} lessons completed

                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="
                            rounded-lg
                            p-2
                            text-[var(--color-text-muted)]
                            hover:bg-white/5
                            lg:hidden
                        "
                    >

                        <X size={20} />

                    </button>

                </div>


                {/* Progress */}

                <div className="mt-5">

                    <div className="mb-2 flex items-center justify-between">

                        <span className="text-xs text-[var(--color-text-muted)]">
                            Progress
                        </span>

                        <span className="text-xs font-bold text-[var(--color-primary)]">
                            {progress}%
                        </span>

                    </div>


                    <div className="h-2 overflow-hidden rounded-full bg-[#242424]">

                        <div
                            className="
                                h-full
                                rounded-full
                                bg-[var(--color-primary)]
                                transition-all
                            "
                            style={{
                                width: `${progress}%`,
                            }}
                        />

                    </div>

                </div>

            </div>


            {/* Curriculum */}

            {curriculumLoading ? (

                <div className="flex flex-1 items-center justify-center p-8">

                    <div className="flex items-center gap-2 text-sm text-white">

                        <Loader2
                            size={17}
                            className="
                                animate-spin
                                text-[var(--color-primary)]
                            "
                        />

                        Loading curriculum...

                    </div>

                </div>

            ) : curriculum.length === 0 ? (

                <div className="p-6 text-center">

                    <BookOpen
                        size={35}
                        className="
                            mx-auto
                            text-[var(--color-primary)]
                        "
                    />

                    <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                        No lessons available yet.
                    </p>

                </div>

            ) : (

                <div
    className="
        flex-1
        overflow-y-auto
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden
    "
>

                    {curriculum.map(
                        (subCourse) => {

                            const subCourseOpen =
                                openSubCourses[
                                    subCourse._id
                                ];

                            return (

                                <div
                                    key={
                                        subCourse._id
                                    }
                                    className="
                                        border-b
                                        border-[var(--color-border)]
                                    "
                                >

                                    {/* Sub Course */}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleSubCourse(
                                                subCourse._id
                                            )
                                        }
                                        className="
                                            flex
                                            w-full
                                            items-center
                                            gap-3
                                            px-5
                                            py-4
                                            text-left
                                            transition
                                            hover:bg-[var(--color-primary)]/5
                                        "
                                    >

                                        {subCourseOpen ? (

                                            <ChevronDown
                                                size={18}
                                                className="text-[var(--color-primary)]"
                                            />

                                        ) : (

                                            <ChevronRight
                                                size={18}
                                                className="text-[var(--color-text-muted)]"
                                            />

                                        )}


                                        <div className="min-w-0 flex-1">

                                            <p className="text-xs font-medium text-[var(--color-primary)]">
                                                Sub Course{" "}
                                                {subCourse.position}
                                            </p>

                                            <p className="mt-1 truncate text-sm font-semibold text-white">
                                                {
                                                    subCourse.title
                                                }
                                            </p>

                                        </div>

                                    </button>


                                    {subCourseOpen && (

                                        <div className="pb-2">

                                            {subCourse.chapters.map(
                                                (
                                                    chapter
                                                ) => {

                                                    const chapterOpen =
                                                        openChapters[
                                                            chapter._id
                                                        ];

                                                    return (

                                                        <div
                                                            key={
                                                                chapter._id
                                                            }
                                                        >

                                                            {/* Chapter */}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleChapter(
                                                                        chapter._id
                                                                    )
                                                                }
                                                                className="
                                                                    flex
                                                                    w-full
                                                                    items-center
                                                                    gap-3
                                                                    px-8
                                                                    py-3
                                                                    text-left
                                                                    transition
                                                                    hover:bg-[var(--color-primary)]/5
                                                                "
                                                            >

                                                                {chapterOpen ? (

                                                                    <ChevronDown
                                                                        size={16}
                                                                        className="text-[var(--color-primary)]"
                                                                    />

                                                                ) : (

                                                                    <ChevronRight
                                                                        size={16}
                                                                        className="text-[var(--color-text-muted)]"
                                                                    />

                                                                )}


                                                                <div className="min-w-0 flex-1">

                                                                    <p className="text-xs text-[var(--color-text-muted)]">
                                                                        Chapter{" "}
                                                                        {
                                                                            chapter.position
                                                                        }
                                                                    </p>

                                                                    <p className="mt-0.5 truncate text-sm font-medium text-white">
                                                                        {
                                                                            chapter.title
                                                                        }
                                                                    </p>

                                                                </div>

                                                            </button>


                                                            {chapterOpen && (

                                                                <div>

                                                                    {chapter.topics.map(
                                                                        (
                                                                            topic
                                                                        ) => {

                                                                            const topicOpen =
                                                                                openTopics[
                                                                                    topic._id
                                                                                ];

                                                                            return (

                                                                                <div
                                                                                    key={
                                                                                        topic._id
                                                                                    }
                                                                                >

                                                                                    {/* Topic */}

                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            toggleTopic(
                                                                                                topic._id
                                                                                            )
                                                                                        }
                                                                                        className="
                                                                                            flex
                                                                                            w-full
                                                                                            items-center
                                                                                            gap-3
                                                                                            px-11
                                                                                            py-3
                                                                                            text-left
                                                                                            transition
                                                                                            hover:bg-[var(--color-primary)]/5
                                                                                        "
                                                                                    >

                                                                                        {topicOpen ? (

                                                                                            <ChevronDown
                                                                                                size={15}
                                                                                                className="text-[var(--color-primary)]"
                                                                                            />

                                                                                        ) : (

                                                                                            <ChevronRight
                                                                                                size={15}
                                                                                                className="text-[var(--color-text-muted)]"
                                                                                            />

                                                                                        )}

                                                                                        <p className="flex-1 truncate text-sm font-medium text-white">
                                                                                            {
                                                                                                topic.title
                                                                                            }
                                                                                        </p>

                                                                                    </button>


                                                                                    {topicOpen && (

                                                                                        <div className="pb-2">

                                                                                            {topic.lessons.map(
                                                                                                (
                                                                                                    lesson
                                                                                                ) => {

                                                                                                    const completed =
                                                                                                        isLessonCompleted(
                                                                                                            lesson._id
                                                                                                        );

                                                                                                    const selected =
                                                                                                        selectedLesson?._id ===
                                                                                                        lesson._id;

                                                                                                    return (

                                                                                                        <button
                                                                                                            key={
                                                                                                                lesson._id
                                                                                                            }
                                                                                                            type="button"
                                                                                                            onClick={() =>
                                                                                                                handleSelectLesson(
                                                                                                                    lesson
                                                                                                                )
                                                                                                            }
                                                                                                            className={`
                                                                                                                flex
                                                                                                                w-full
                                                                                                                items-center
                                                                                                                gap-3
                                                                                                                border-l-2
                                                                                                                px-14
                                                                                                                py-3
                                                                                                                text-left
                                                                                                                transition
                                                                                                                ${
                                                                                                                    selected
                                                                                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                                                                                                        : "border-transparent hover:bg-[var(--color-primary)]/5"
                                                                                                                }
                                                                                                            `}
                                                                                                        >

                                                                                                            {completed ? (

                                                                                                                <CheckCircle2
                                                                                                                    size={16}
                                                                                                                    className="
                                                                                                                        shrink-0
                                                                                                                        text-[var(--color-primary)]
                                                                                                                    "
                                                                                                                />

                                                                                                            ) : (

                                                                                                                <PlayCircle
                                                                                                                    size={16}
                                                                                                                    className={`
                                                                                                                        shrink-0
                                                                                                                        ${
                                                                                                                            selected
                                                                                                                                ? "text-[var(--color-primary)]"
                                                                                                                                : "text-[var(--color-text-muted)]"
                                                                                                                        }
                                                                                                                    `}
                                                                                                                />

                                                                                                            )}


                                                                                                            <span
                                                                                                                className={`
                                                                                                                    line-clamp-2
                                                                                                                    flex-1
                                                                                                                    text-sm
                                                                                                                    ${
                                                                                                                        selected
                                                                                                                            ? "font-semibold text-[var(--color-primary)]"
                                                                                                                            : completed
                                                                                                                                ? "text-[var(--color-text-muted)]"
                                                                                                                                : "text-white"
                                                                                                                    }
                                                                                                                `}
                                                                                                            >
                                                                                                                {
                                                                                                                    lesson.title
                                                                                                                }
                                                                                                            </span>

                                                                                                        </button>

                                                                                                    );

                                                                                                }
                                                                                            )}

                                                                                        </div>

                                                                                    )}

                                                                                </div>

                                                                            );

                                                                        }
                                                                    )}

                                                                </div>

                                                            )}

                                                        </div>

                                                    );

                                                }
                                            )}

                                        </div>

                                    )}

                                </div>

                            );

                        }
                    )}

                </div>

            )}

        </div>

    );


    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (

        <div className="flex min-h-screen flex-col bg-black text-white lg:h-screen lg:overflow-hidden">


            {/* ========================================================== */}
            {/* Header */}
            {/* ========================================================== */}

            <header
                className="
                    shrink-0
                    border-b
                    border-[var(--color-border)]
                    bg-black/95
                    backdrop-blur
                "
            >

                <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-5">

                    <div className="flex items-center gap-4">


                        {/* Mobile Menu */}

                        <button
                            type="button"
                            onClick={() =>
                                setSidebarOpen(true)
                            }
                            className="
                                rounded-lg
                                border
                                border-[var(--color-border)]
                                p-2
                                text-[var(--color-primary)]
                                hover:bg-[var(--color-primary)]/10
                                lg:hidden
                            "
                        >

                            <Menu size={20} />

                        </button>


                        {/* Course */}

                        <div className="min-w-0 flex-1">

                            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
                                Now Learning
                            </p>

                            <h1 className="mt-1 truncate text-sm font-bold text-white sm:text-base">
                                {enrollment.course?.title ||
                                    "Course"}
                            </h1>

                        </div>


                        {/* Progress */}

                        <div className="hidden w-56 sm:block">

                            <div className="mb-1.5 flex items-center justify-between">

                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                    Course Progress
                                </span>

                                <span className="text-xs font-bold text-[var(--color-primary)]">
                                    {progress}%
                                </span>

                            </div>


                            <div className="h-1.5 overflow-hidden rounded-full bg-[#242424]">

                                <div
                                    className="
                                        h-full
                                        rounded-full
                                        bg-[var(--color-primary)]
                                        transition-all
                                    "
                                    style={{
                                        width: `${progress}%`,
                                    }}
                                />

                            </div>

                        </div>

                    </div>

                </div>

            </header>


            {/* ========================================================== */}
            {/* Mobile Sidebar Overlay */}
            {/* ========================================================== */}

            {sidebarOpen && (

                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        bg-black/70
                        backdrop-blur-sm
                        lg:hidden
                    "
                    onClick={() =>
                        setSidebarOpen(false)
                    }
                >

                    <aside
                        className="
                            h-full
                            w-[88%]
                            max-w-[380px]
                            bg-[var(--color-surface)]
                            shadow-2xl
                        "
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <CurriculumSidebar />

                    </aside>

                </div>

            )}


            {/* ========================================================== */}
            {/* Desktop Learning Layout */}
            {/* ========================================================== */}

            <main className="mx-auto flex w-full max-w-[1500px] flex-1 min-h-0">


                {/* Desktop Sidebar */}

                <aside
                    className="
                        hidden
                        w-[360px]
                        shrink-0
                        border-r
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        lg:block
                        lg:h-full
                        lg:min-h-0
                        lg:overflow-hidden
                    "
                >

                    <CurriculumSidebar />

                </aside>


                {/* ====================================================== */}
                {/* Lesson Content */}
                {/* ====================================================== */}

                <section className="min-w-0 flex-1 bg-black lg:min-h-0 lg:overflow-y-auto lg:scroll-smooth">

                    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">


                        {!selectedLesson ? (

                            <div className="flex min-h-[500px] items-center justify-center text-center">

                                <div>

                                    <BookOpen
                                        size={50}
                                        className="
                                            mx-auto
                                            text-[var(--color-primary)]
                                        "
                                    />

                                    <h2 className="mt-5 text-xl font-bold text-white">
                                        Select a lesson
                                    </h2>

                                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                        Choose a lesson from the course
                                        content to start learning.
                                    </p>

                                </div>

                            </div>

                        ) : (

                            <>


                                {/* ================================================== */}
                                {/* Lesson Header */}
                                {/* ================================================== */}

                               <div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">

                                        <span
                                            className="
                                                rounded-full
                                                border
                                                border-[var(--color-primary)]/30
                                                bg-[var(--color-primary)]/10
                                                px-3
                                                py-1
                                                text-xs
                                                font-bold
                                                text-[var(--color-primary)]
                                            "
                                        >
                                            Lesson{" "}
                                            {selectedLesson.position}
                                        </span>


                                        {selectedLessonCompleted && (

                                            <span
                                                className="
                                                    flex
                                                    items-center
                                                    gap-1.5
                                                    rounded-full
                                                    border
                                                    border-[var(--color-primary)]/30
                                                    bg-[var(--color-primary)]/10
                                                    px-3
                                                    py-1
                                                    text-xs
                                                    font-bold
                                                    text-[var(--color-primary)]
                                                "
                                            >

                                                <CheckCircle2
                                                    size={13}
                                                />

                                                Completed

                                            </span>

                                        )}

                                        </div>

                                        {selectedLesson.attachments?.some((attachment) => attachment?.url) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const attachmentIndex = selectedLesson.attachments.findIndex(
                                                        (attachment) => attachment?.url
                                                    );

                                                    if (attachmentIndex !== -1) {
                                                        navigate(
                                                            `/student/material/${selectedLesson._id}?attachment=${attachmentIndex}&enrollment=${enrollmentId}`
                                                        );
                                                    }
                                                }}
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20"
                                            >
                                                <FileText size={16} />
                                                Read Material
                                                <ExternalLink size={15} />
                                            </button>
                                        )}
                                    </div>


                                    <h2
                                        className="
                                            mt-3
                                            text-3xl
                                            font-bold
                                            tracking-tight
                                            text-white
                                            sm:text-4xl
                                        "
                                    >
                                        {selectedLesson.title}
                                    </h2>


                                    {selectedLesson.description && (

                                        <p
                                            className="
                                                mt-4
                                                max-w-3xl
                                                text-base
                                                leading-7
                                                text-[var(--color-text-muted)]
                                            "
                                        >
                                            {
                                                selectedLesson.description
                                            }
                                        </p>

                                    )}

                                </div>


                                {/* ================================================== */}
                                {/* Video */}
                                {/* ================================================== */}

                                {selectedLesson.video?.url ? (

                                    <div
                                        className="
                                            mt-7
                                            overflow-hidden
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[#111111]
                                            shadow-2xl
                                        "
                                    >

                                        {getYouTubeVideoId(
                                            selectedLesson.video.url
                                        ) ? (

                                            <div className="aspect-video w-full">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(
                                                        selectedLesson.video.url
                                                    )}`}
                                                    title={selectedLesson.title}
                                                    className="h-full w-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    referrerPolicy="strict-origin-when-cross-origin"
                                                    allowFullScreen
                                                />
                                            </div>

                                        ) : (

                                            <video
                                                src={selectedLesson.video.url}
                                                poster={
                                                    selectedLesson.video.thumbnail ||
                                                    undefined
                                                }
                                                controls
                                                className="aspect-video w-full"
                                            />

                                        )}

                                    </div>

                                ) : (

                                    <div
                                        className="
                                            mt-8
                                            flex
                                            aspect-video
                                            items-center
                                            justify-center
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                        "
                                    >

                                        <div className="text-center">

                                            <div
                                                className="
                                                    mx-auto
                                                    flex
                                                    h-16
                                                    w-16
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                    bg-[var(--color-primary)]/10
                                                "
                                            >

                                                <PlayCircle
                                                    size={34}
                                                    className="
                                                        text-[var(--color-primary)]
                                                    "
                                                />

                                            </div>

                                            <p className="mt-4 text-sm font-medium text-white">
                                                No video available
                                            </p>

                                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                This lesson currently has no
                                                video attached.
                                            </p>

                                        </div>

                                    </div>

                                )}



                                {/* Lesson Content */}
                                {/* ================================================== */}

                                {selectedLesson.content && (

                                    <article
                                        className="
                                            mt-10
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            p-6
                                            sm:p-8
                                        "
                                    >

                                        <h3 className="text-lg font-bold text-[var(--color-primary)]">
                                            Lesson Content
                                        </h3>


                                        <EditorContent
                                            editor={contentEditor}
                                            className='
                                                tiptap-lesson-content-inner
                                                mt-6
                                                text-sm
                                                leading-[1.9]
                                                [&_p]:leading-[1.9]
                                                [&_.tiptap-mathematics-render]:inline-block
                                                [&_.tiptap-mathematics-render]:align-middle
                                                [&_.tiptap-mathematics-render[data-type="inline-math"]]:mx-0.5
                                                [&_.tiptap-mathematics-render[data-type="inline-math"]]:my-1
                                                text-slate-100
                                                [&_mark]:!text-slate-900
                                                [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold
                                                [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-bold
                                                [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold
                                                [&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:text-base [&_h4]:font-bold
                                                [&_p]:mb-4
                                                [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
                                                [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6
                                                [&_li]:mb-1.5
                                                [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-primary)]/50 [&_blockquote]:bg-white/5 [&_blockquote]:py-3 [&_blockquote]:pl-4 [&_blockquote]:italic
                                                [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/40 [&_pre]:p-4
                                                [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px]
                                                [&_pre_code]:bg-transparent [&_pre_code]:p-0
                                                [&_a]:!text-[var(--color-primary)] [&_a]:underline [&_a]:underline-offset-2
                                                [&_hr]:my-6 [&_hr]:border-[var(--color-border)]
                                                [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl
                                                [&_.tiptap-mathematics-render[data-type="block-math"]]:my-6
                                                [&_.tiptap-mathematics-render[data-type="block-math"]]:overflow-x-auto
                                                [&_.tiptap-mathematics-render[data-type="block-math"]]:py-2
                                                [&>*:first-child]:mt-0
                                            '
                                        />

                                    </article>

                                )}


                                {/* ================================================== */}
                                {/* Course Material */}
                                {/* ================================================== */}

                                {/* {selectedLesson.attachments?.length > 0 && (
                                    <section className="mt-10">
                                        <div className="mb-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                                                Study Resources
                                            </p>
                                            <h3 className="mt-1 text-xl font-bold text-white">
                                                Course Material
                                            </h3>
                                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                Open the attached learning material when you are ready to study.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {selectedLesson.attachments.map((attachment, index) => {
                                                if (!attachment?.url) return null;

                                                const isPdf = attachment.fileType?.toLowerCase().includes("pdf");

                                                return (
                                                    <div
                                                        key={`${attachment.url}-${index}`}
                                                        className="group flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-primary)]/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-4">
                                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10">
                                                                <FileText size={22} className="text-[var(--color-primary)]" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                                                                    {isPdf ? "PDF Document" : "Course Material"}
                                                                </p>
                                                                <p
                                                                    className="mt-1 truncate text-sm font-semibold text-white sm:text-base"
                                                                    title={attachment.title}
                                                                >
                                                                    {attachment.title || `Course Material ${index + 1}`}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/student/material/${selectedLesson._id}?attachment=${index}&enrollment=${enrollmentId}`
                                                                )
                                                            }
                                                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
                                                        >
                                                            Read Material
                                                            <ExternalLink size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )} */}


                                {/* Lesson Quiz */}
                                {/* ================================================== */}

                                {selectedLesson.quiz?.enabled &&
                                    quizQuestions.length > 0 && (
                                        <section
                                            className="
                                                mt-8
                                                overflow-hidden
                                                rounded-2xl
                                                border
                                                border-[var(--color-border)]
                                                bg-[var(--color-surface)]
                                            "
                                        >
                                            {/* Quiz Header */}
                                            <div
                                                className="
                                                    border-b
                                                    border-[var(--color-border)]
                                                    bg-[var(--color-primary)]/5
                                                    p-6
                                                    sm:p-7
                                                "
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className="
                                                                flex
                                                                h-11
                                                                w-11
                                                                shrink-0
                                                                items-center
                                                                justify-center
                                                                rounded-xl
                                                                bg-[var(--color-primary)]/10
                                                            "
                                                        >
                                                            <Trophy
                                                                size={21}
                                                                className="text-[var(--color-primary)]"
                                                            />
                                                        </div>

                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                                                                Lesson Quiz
                                                            </p>

                                                            <h3 className="mt-1 text-xl font-bold text-white">
                                                                {selectedLesson.quiz.title ||
                                                                    "Lesson Quiz"}
                                                            </h3>

                                                            {selectedLesson.quiz.description && (
                                                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                                                                    {
                                                                        selectedLesson
                                                                            .quiz
                                                                            .description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-full border border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                                                        Passing score:{" "}
                                                        {selectedLesson.quiz.passingScore ??
                                                            70}
                                                        %
                                                    </div>
                                                </div>
                                            </div>

                                            {!quizSubmitted ? (
                                                <div className="p-6 sm:p-7">
                                                    {/* Progress */}
                                                    <div className="mb-7">
                                                        <div className="mb-2 flex items-center justify-between text-xs">
                                                            <span className="font-medium text-[var(--color-text-muted)]">
                                                                Question{" "}
                                                                {quizQuestionIndex +
                                                                    1}{" "}
                                                                of{" "}
                                                                {
                                                                    quizQuestions.length
                                                                }
                                                            </span>

                                                            <span className="font-semibold text-[var(--color-primary)]">
                                                                {Math.round(
                                                                    ((quizQuestionIndex +
                                                                        1) /
                                                                        quizQuestions.length) *
                                                                    100
                                                                )}
                                                                %
                                                            </span>
                                                        </div>

                                                        <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
                                                            <div
                                                                className="
                                                                    h-full
                                                                    rounded-full
                                                                    bg-[var(--color-primary)]
                                                                    transition-all
                                                                "
                                                                style={{
                                                                    width: `${((quizQuestionIndex + 1) /
                                                                        quizQuestions.length) *
                                                                        100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Question */}
                                                    <div>
                                                        <div className="flex items-start gap-3">
                                                            <span
                                                                className="
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-lg
                                                                    bg-[var(--color-primary)]/10
                                                                    text-xs
                                                                    font-bold
                                                                    text-[var(--color-primary)]
                                                                "
                                                            >
                                                                {quizQuestionIndex +
                                                                    1}
                                                            </span>

                                                            <h4 className="pt-1 text-base font-semibold leading-7 text-white sm:text-lg">
                                                                <MathText
                                                                    as="span"
                                                                    value={currentQuizQuestion?.question}
                                                                />
                                                            </h4>
                                                        </div>

                                                        {/* Options */}
                                                        <div className="mt-6 space-y-3">
                                                            {currentQuizQuestion?.options?.map(
                                                                (
                                                                    option,
                                                                    optionIndex
                                                                ) => {
                                                                    const selected =
                                                                        Number(
                                                                            quizAnswers[
                                                                                quizQuestionIndex
                                                                            ]
                                                                        ) ===
                                                                        optionIndex;

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                `${quizQuestionIndex}-${optionIndex}`
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleQuizAnswer(
                                                                                    optionIndex
                                                                                )
                                                                            }
                                                                            className={`
                                                                                flex
                                                                                w-full
                                                                                items-center
                                                                                gap-3
                                                                                rounded-xl
                                                                                border
                                                                                p-4
                                                                                text-left
                                                                                transition
                                                                                ${
                                                                                    selected
                                                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                                                                        : "border-[var(--color-border)] bg-black/10 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5]"
                                                                                }
                                                                            `}
                                                                        >
                                                                            <span
                                                                                className={`
                                                                                    flex
                                                                                    h-8
                                                                                    w-8
                                                                                    shrink-0
                                                                                    items-center
                                                                                    justify-center
                                                                                    rounded-full
                                                                                    border
                                                                                    text-xs
                                                                                    font-bold
                                                                                    ${
                                                                                        selected
                                                                                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black"
                                                                                            : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                                                                                    }
                                                                                `}
                                                                            >
                                                                                {String.fromCharCode(
                                                                                    65 +
                                                                                    optionIndex
                                                                                )}
                                                                            </span>

                                                                            <MathText
                                                                                as="span"
                                                                                value={option}
                                                                                className={`
                                                                                    flex-1
                                                                                    text-sm
                                                                                    leading-6
                                                                                    ${
                                                                                        selected
                                                                                            ? "font-semibold text-white"
                                                                                            : "text-[var(--color-text-muted)]"
                                                                                    }
                                                                                `}
                                                                            />

                                                                            {selected && (
                                                                                <Check
                                                                                    size={
                                                                                        17
                                                                                    }
                                                                                    className="shrink-0 text-[var(--color-primary)]"
                                                                                />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Navigation */}
                                                    <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                handleQuizPrevious
                                                            }
                                                            disabled={
                                                                quizQuestionIndex ===
                                                                0
                                                            }
                                                            className="
                                                                flex
                                                                items-center
                                                                justify-center
                                                                gap-2
                                                                rounded-xl
                                                                border
                                                                border-[var(--color-border)]
                                                                px-5
                                                                py-3
                                                                text-sm
                                                                font-semibold
                                                                text-white
                                                                transition
                                                                hover:border-[var(--color-primary)]/40
                                                                disabled:cursor-not-allowed
                                                                disabled:opacity-30
                                                            "
                                                        >
                                                            <ArrowLeft
                                                                size={17}
                                                            />
                                                            Previous
                                                        </button>

                                                        {quizQuestionIndex <
                                                        quizQuestions.length -
                                                            1 ? (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleQuizNext
                                                                }
                                                                disabled={
                                                                    typeof quizAnswers[
                                                                        quizQuestionIndex
                                                                    ] !==
                                                                    "number"
                                                                }
                                                                className="
                                                                    flex
                                                                    items-center
                                                                    justify-center
                                                                    gap-2
                                                                    rounded-xl
                                                                    bg-[var(--color-primary)]
                                                                    px-5
                                                                    py-3
                                                                    text-sm
                                                                    font-bold
                                                                    text-black
                                                                    transition
                                                                    hover:bg-[var(--color-primary-dark)]
                                                                    disabled:cursor-not-allowed
                                                                    disabled:opacity-40
                                                                "
                                                            >
                                                                Next
                                                                <ArrowRight
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleQuizSubmit
                                                                }
                                                                disabled={
                                                                    quizQuestions.some(
                                                                        (
                                                                            _,
                                                                            index
                                                                        ) =>
                                                                            typeof quizAnswers[
                                                                                index
                                                                            ] !==
                                                                            "number"
                                                                    )
                                                                }
                                                                className="
                                                                    flex
                                                                    items-center
                                                                    justify-center
                                                                    gap-2
                                                                    rounded-xl
                                                                    bg-[var(--color-primary)]
                                                                    px-5
                                                                    py-3
                                                                    text-sm
                                                                    font-bold
                                                                    text-black
                                                                    transition
                                                                    hover:bg-[var(--color-primary-dark)]
                                                                    disabled:cursor-not-allowed
                                                                    disabled:opacity-40
                                                                "
                                                            >
                                                                <Check
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                                Submit Quiz
                                                            </button>
                                                        )}
                                                    </div>

                                                    {typeof quizAnswers[
                                                        quizQuestionIndex
                                                    ] !== "number" && (
                                                        <p className="mt-3 text-right text-xs text-[var(--color-text-muted)]">
                                                            Select an option to continue.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-6 sm:p-8">
                                                    <div className="text-center">
                                                        <div
                                                            className="
                                                                mx-auto
                                                                flex
                                                                h-16
                                                                w-16
                                                                items-center
                                                                justify-center
                                                                rounded-full
                                                                bg-[var(--color-primary)]/10
                                                            "
                                                        >
                                                            {quizScore?.passed ? (
                                                                <Trophy
                                                                    size={30}
                                                                    className="text-[var(--color-primary)]"
                                                                />
                                                            ) : (
                                                                <Circle
                                                                    size={30}
                                                                    className="text-[var(--color-primary)]"
                                                                />
                                                            )}
                                                        </div>

                                                        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                                                            Quiz Result
                                                        </p>

                                                        <h4 className="mt-2 text-2xl font-bold text-white">
                                                            {quizScore?.percentage ??
                                                                0}
                                                            %
                                                        </h4>

                                                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                                            You scored{" "}
                                                            {
                                                                quizScore?.earnedPoints
                                                            }{" "}
                                                            out of{" "}
                                                            {
                                                                quizScore?.totalPoints
                                                            }{" "}
                                                            points.
                                                        </p>

                                                        <div
                                                            className={`
                                                                mx-auto
                                                                mt-5
                                                                inline-flex
                                                                rounded-full
                                                                border
                                                                px-4
                                                                py-2
                                                                text-xs
                                                                font-bold
                                                                ${
                                                                    quizScore?.passed
                                                                        ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                                                        : "border-red-500/30 bg-red-500/10 text-red-400"
                                                                }
                                                            `}
                                                        >
                                                            {quizScore?.passed
                                                                ? "Passed"
                                                                : "Not passed"}
                                                        </div>

                                                        <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-[var(--color-text-muted)]">
                                                            Passing score is{" "}
                                                            {selectedLesson.quiz
                                                                .passingScore ??
                                                                70}
                                                            %. You can review
                                                            your answers and try
                                                            again if allowed.
                                                        </p>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                handleQuizReset
                                                            }
                                                            className="
                                                                mx-auto
                                                                mt-6
                                                                flex
                                                                items-center
                                                                justify-center
                                                                gap-2
                                                                rounded-xl
                                                                border
                                                                border-[var(--color-border)]
                                                                px-5
                                                                py-3
                                                                text-sm
                                                                font-semibold
                                                                text-white
                                                                transition
                                                                hover:border-[var(--color-primary)]/40
                                                            "
                                                        >
                                                            <RotateCcw
                                                                size={16}
                                                            />
                                                            Retake Quiz
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    )}


                                {/* ================================================== */}
                                {/* Lesson Meta */}
                                {/* ================================================== */}

                                <div
                                    className="
                                        mt-6
                                        flex
                                        flex-wrap
                                        gap-5
                                        text-sm
                                        text-[var(--color-text-muted)]
                                    "
                                >

                                    <span className="flex items-center gap-2">

                                        <Clock3
                                            size={17}
                                            className="text-[var(--color-primary)]"
                                        />

                                        {selectedLesson.video?.duration ||
                                            0}{" "}
                                        minutes

                                    </span>


                                    <span className="flex items-center gap-2">

                                        <BookOpen
                                            size={17}
                                            className="text-[var(--color-primary)]"
                                        />

                                        Lesson{" "}
                                        {selectedLesson.position}

                                    </span>

                                </div>


                                {/* ================================================== */}
                                {/* Complete */}
                                {/* ================================================== */}

                                <div
                                    className="
                                        mt-8
                                        border-t
                                        border-[var(--color-border)]
                                        pt-7
                                    "
                                >

                                    {selectedLessonCompleted ? (

                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-3
                                                rounded-xl
                                                border
                                                border-[var(--color-primary)]/30
                                                bg-[var(--color-primary)]/10
                                                p-4
                                            "
                                        >

                                            <CheckCircle2
                                                size={22}
                                                className="
                                                    shrink-0
                                                    text-[var(--color-primary)]
                                                "
                                            />

                                            <div>

                                                <p className="text-sm font-semibold text-[var(--color-primary)]">
                                                    Lesson completed
                                                </p>

                                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                    Your course progress has
                                                    been updated.
                                                </p>

                                            </div>

                                        </div>

                                    ) : (

                                        <button
                                            type="button"
                                            onClick={
                                                handleCompleteLesson
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                bg-[var(--color-primary)]
                                                px-6
                                                py-3.5
                                                text-sm
                                                font-bold
                                                text-black
                                                transition
                                                hover:bg-[var(--color-primary-dark)]
                                                disabled:cursor-not-allowed
                                                disabled:opacity-60
                                                sm:w-auto
                                            "
                                        >

                                            {actionLoading ? (

                                                <>
                                                    <Loader2
                                                        size={17}
                                                        className="animate-spin"
                                                    />

                                                    Updating...

                                                </>

                                            ) : (

                                                <>
                                                    <CheckCircle2
                                                        size={17}
                                                    />

                                                    Mark as Complete
                                                </>

                                            )}

                                        </button>

                                    )}

                                </div>


                                {/* ================================================== */}
                                {/* Previous / Next */}
                                {/* ================================================== */}

                                <div
                                    className="
                                        mt-8
                                        grid
                                        gap-3
                                        border-t
                                        border-[var(--color-border)]
                                        pt-6
                                        sm:grid-cols-2
                                    "
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            handlePreviousLesson
                                        }
                                        disabled={!previousLesson}
                                        className="
                                            flex
                                            items-center
                                            gap-3
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            px-4
                                            py-3
                                            text-left
                                            transition
                                            hover:border-[var(--color-primary)]/40
                                            disabled:cursor-not-allowed
                                            disabled:opacity-30
                                        "
                                    >

                                        <ArrowLeft
                                            size={18}
                                            className="text-[var(--color-primary)]"
                                        />

                                        <div className="min-w-0">

                                            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                                Previous
                                            </p>

                                            <p className="mt-1 truncate text-sm font-semibold text-white">
                                                {previousLesson?.title ||
                                                    "No previous lesson"}
                                            </p>

                                        </div>

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            handleNextLesson
                                        }
                                        disabled={!nextLesson}
                                        className="
                                            flex
                                            items-center
                                            justify-end
                                            gap-3
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            px-4
                                            py-3
                                            text-right
                                            transition
                                            hover:border-[var(--color-primary)]/40
                                            disabled:cursor-not-allowed
                                            disabled:opacity-30
                                        "
                                    >

                                        <div className="min-w-0">

                                            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                                Next
                                            </p>

                                            <p className="mt-1 truncate text-sm font-semibold text-white">
                                                {nextLesson?.title ||
                                                    "No next lesson"}
                                            </p>

                                        </div>


                                        <ArrowRight
                                            size={18}
                                            className="text-[var(--color-primary)]"
                                        />

                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </section>

            </main>

        </div>

    );

};


export default Learning;