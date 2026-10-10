import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
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
import "@/styles/lesson-math.css";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Trash2,
    Loader2,
    FileText,
    Video,
    Eye,
    EyeOff,
    Play,
    Upload,
    ExternalLink,
    X,
    File,
    Plus,
    ClipboardList,
    Sigma,
    Undo2,
    Redo2,
    Minus,
} from "lucide-react";

import {
    getLessons,
    createLesson,
    updateLesson,
    deleteLesson,
} from "@/api/curriculum.api";

import EquationPanel from "@/components/forms/EquationPanel";
import MathText from "@/components/forms/MathText";

/*
|--------------------------------------------------------------------------
| Font Size Extension
|--------------------------------------------------------------------------
|
| Tiptap's core TextStyle mark has no size support out of the box - this
| is the standard documented way to add one: extend TextStyle with a
| `fontSize` attribute that renders as an inline style, plus a couple of
| commands to set/clear it. No extra npm package needed - Extension comes
| from @tiptap/core, already a dependency of everything else here.
|
*/

const FontSize = Extension.create({
    name: "fontSize",

    addOptions() {
        return { types: ["textStyle"] };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setFontSize: (fontSize) => ({ chain }) =>
                chain().setMark("textStyle", { fontSize }).run(),
            unsetFontSize: () => ({ chain }) =>
                chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

const FONT_SIZES = [
    { label: "Small", value: "12px" },
    { label: "Normal", value: "" },
    { label: "Large", value: "20px" },
    { label: "X-Large", value: "28px" },
    { label: "Huge", value: "36px" },
];

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

function LessonEditor() {
    const navigate = useNavigate();
    const { courseId, lessonId } = useParams();
    const [searchParams] = useSearchParams();

    const isCreateMode = lessonId === "new";
    const topicId = searchParams.get("topicId");

    const editorHydratedRef = useRef(false);
    const editorRef = useRef(null);

    const [lesson, setLesson] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        position: "",
        content: "",
        isPreview: false,
    });

    const [videoData, setVideoData] = useState({
        type: "youtube",
        url: "",
        duration: "",
    });

    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);

    /*
    |--------------------------------------------------------------------------
    | Equation Panel
    |--------------------------------------------------------------------------
    |
    | Null when closed. When open:
    |   - pos === null  -> inserting a brand-new equation at the cursor
    |   - pos !== null  -> editing the existing math node at that document
    |                      position (opened by clicking an equation, wired
    |                      up via Mathematics.configure()'s onClick below)
    |
    */
    const [equationPanel, setEquationPanel] = useState(null);

    // Refs to the quiz question/option DOM fields, keyed by a string id
    // (see quizFieldKey below), so equation insertion can land at the
    // actual cursor position instead of always appending to the end.
    const quizFieldRefs = useRef({});
    const quizFieldKey = (questionIndex, field, optionIndex) =>
        field === "question"
            ? `q-${questionIndex}`
            : `q-${questionIndex}-opt-${optionIndex}`;


    /*
    |--------------------------------------------------------------------------
    | Quiz
    |--------------------------------------------------------------------------
    */

    const createEmptyQuestion = () => ({
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 1,
        explanation: "",
    });

    const createEmptyQuiz = () => ({
        enabled: false,
        title: "Lesson Quiz",
        description: "",
        passingScore: 70,
        maxAttempts: 1,
        questions: [createEmptyQuestion()],
    });

    const [quiz, setQuiz] = useState(createEmptyQuiz);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    /*
    |--------------------------------------------------------------------------
    | Fetch Lesson
    |--------------------------------------------------------------------------
    */

    const fetchLesson = async () => {
        try {
            setLoading(true);
            setError("");

            if (isCreateMode) {
                setLesson(null);
                setFormData({
                    title: "",
                    description: "",
                    position: "",
                    content: "",
                    isPreview: false,
                });
                setVideoData({
                    type: "youtube",
                    url: "",
                    duration: "",
                });
                setSelectedVideo(null);
                setSelectedFiles([]);
                setQuiz(createEmptyQuiz());
                return;
            }

            const response = await getLessons();

            const lessons =
                response?.data ||
                response ||
                [];

            const currentLesson = lessons.find(
                (item) =>
                    String(item?._id) ===
                    String(lessonId)
            );

            if (!currentLesson) {
                setError("Lesson not found.");
                return;
            }

            setLesson(currentLesson);

            setFormData({
                title: currentLesson?.title || "",
                description:
                    currentLesson?.description || "",
                position:
                    currentLesson?.position || "",
                content: normalizeLessonContent(
                    currentLesson?.content
                ),
                isPreview:
                    Boolean(
                        currentLesson?.isPreview
                    ),
            });

            const existingVideoUrl =
                currentLesson?.video?.url || "";

            const isExistingYouTube =
                /(?:youtube\.com|youtu\.be)/i.test(
                    existingVideoUrl
                );

            setVideoData({
                type:
                    currentLesson?.video?.type ||
                    (isExistingYouTube
                        ? "youtube"
                        : existingVideoUrl
                          ? "upload"
                          : "youtube"),
                url: existingVideoUrl,
                duration:
                    currentLesson?.video?.duration
                        ? String(
                              currentLesson.video
                                  .duration
                          )
                        : "",
            });

            setSelectedVideo(null);
            setSelectedFiles([]);

            const existingQuiz = currentLesson?.quiz;

            if (existingQuiz) {
                setQuiz({
                    enabled: Boolean(existingQuiz.enabled),
                    title: existingQuiz.title || "Lesson Quiz",
                    description: existingQuiz.description || "",
                    passingScore:
                        existingQuiz.passingScore ?? 70,
                    maxAttempts:
                        existingQuiz.maxAttempts ?? 1,
                    questions:
                        Array.isArray(existingQuiz.questions) &&
                        existingQuiz.questions.length > 0
                            ? existingQuiz.questions.map((question) => ({
                                  question: question.question || "",
                                  options:
                                      Array.isArray(question.options) &&
                                      question.options.length >= 2
                                          ? [...question.options]
                                          : ["", "", "", ""],
                                  correctAnswer:
                                      Number(question.correctAnswer ?? 0),
                                  points: Number(question.points ?? 1),
                                  explanation:
                                      question.explanation || "",
                              }))
                            : [createEmptyQuestion()],
                });
            } else {
                setQuiz(createEmptyQuiz());
            }

        } catch (err) {
            console.error(
                "Failed to fetch lesson:",
                err
            );

            setError(
                err?.response?.data?.message ||
                    "Unable to load lesson."
            );
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchLesson();
    }, [lessonId, isCreateMode]);


    /*
    |--------------------------------------------------------------------------
    | Lesson Content Change
    |--------------------------------------------------------------------------
    */

    const handleEditorUpdate = ({ editor }) => {
        setFormData((prev) => ({
            ...prev,
            content: editor.getJSON(),
        }));

        setSuccess("");
        setError("");
    };

    const extractLatexFromMathElement = (node) => {
        const annotation = node.querySelector(
            'annotation[encoding="application/x-tex"], annotation[encoding="application/x-latex"]'
        );

        const candidates = [
            annotation?.textContent,
            node.getAttribute("aria-label"),
            node.getAttribute("data-latex"),
        ];

        return candidates
            .find((value) => value && value.trim())
            ?.replace(/\u00a0/g, " ")
            .trim() || "";
    };

    const domNodeToTiptap = (node, marks = []) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            if (!text) return [];
            return [{ type: "text", text, ...(marks.length ? { marks } : {}) }];
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return [];

        const element = node;
        const tag = element.tagName.toLowerCase();

        if (
            tag === "math" ||
            tag === "mjx-container" ||
            element.classList.contains("katex") ||
            element.classList.contains("katex-display")
        ) {
            const latex = extractLatexFromMathElement(element);
            if (!latex) return [];

            const isBlock =
                tag === "mjx-container" && element.getAttribute("display") === "true" ||
                element.classList.contains("katex-display") ||
                element.getAttribute("data-display") === "true";

            return [
                {
                    type: isBlock ? "blockMath" : "inlineMath",
                    attrs: { latex },
                },
            ];
        }

        if (tag === "br") {
            return [{ type: "hardBreak" }];
        }

        const nextMarks = [...marks];

        /*
         * Word wraps huge amounts of pasted content in <b> purely for
         * internal RTL/complex-script bookkeeping, neutralized with
         * style="mso-bidi-font-weight: normal" - Word itself never
         * renders that text bold. Treating every <b>/<strong> as a real
         * bold mark (the old behavior) turned large chunks of ordinary
         * pasted paragraphs bold, which is the "some text randomly
         * bigger/bolder" bug.
         */
        const styleAttr = (element.getAttribute("style") || "").toLowerCase();
        const isWordFakeBold = /mso-bidi-font-weight\s*:\s*normal/.test(styleAttr);

        if (["strong", "b"].includes(tag) && !isWordFakeBold) nextMarks.push({ type: "bold" });
        if (["em", "i"].includes(tag)) nextMarks.push({ type: "italic" });
        if (tag === "u") nextMarks.push({ type: "underline" });
        if (["s", "strike", "del"].includes(tag)) nextMarks.push({ type: "strike" });
        if (tag === "sup") nextMarks.push({ type: "superscript" });
        if (tag === "sub") nextMarks.push({ type: "subscript" });
        if (tag === "code") nextMarks.push({ type: "code" });
        if (tag === "mark") nextMarks.push({ type: "highlight" });
        if (tag === "a" && element.getAttribute("href")) {
            nextMarks.push({
                type: "link",
                attrs: { href: element.getAttribute("href"), target: element.getAttribute("target") || null },
            });
        }

        return Array.from(element.childNodes).flatMap((child) =>
            domNodeToTiptap(child, nextMarks)
        );
    };

    const handlePaste = (event) => {
        const html = event.clipboardData?.getData("text/html");
        const currentEditor = editorRef.current;
        if (!html || !currentEditor) return false;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const mathNodes = doc.body.querySelectorAll(
            "math, mjx-container, .katex, .katex-display"
        );

        if (!mathNodes.length) return false;

        const blockTags = new Set([
            "p", "div", "h1", "h2", "h3", "h4", "h5", "h6",
            "blockquote", "pre", "li",
        ]);

        const convertBlock = (element) => {
            const tag = element.tagName.toLowerCase();

            if (tag === "ol" || tag === "ul") {
                const type = tag === "ol" ? "orderedList" : "bulletList";
                const items = Array.from(element.children)
                    .filter((child) => child.tagName.toLowerCase() === "li")
                    .map((li) => ({
                        type: "listItem",
                        content: convertListItem(li),
                    }));
                return items.length ? [{ type, content: items }] : [];
            }

            if (!blockTags.has(tag)) {
                const inline = domNodeToTiptap(element);
                return inline.length ? [{ type: "paragraph", content: inline }] : [];
            }

            if (tag === "li") {
                return [{ type: "listItem", content: convertListItem(element) }];
            }

            const mathBlock = Array.from(element.children).find((child) =>
                child.classList?.contains("katex-display") ||
                child.tagName?.toLowerCase() === "math" ||
                (child.tagName?.toLowerCase() === "mjx-container" && child.getAttribute("display") === "true")
            );

            if (mathBlock && element.children.length === 1) {
                const math = domNodeToTiptap(mathBlock);
                return math.length ? math : [];
            }

            const content = Array.from(element.childNodes).flatMap((child) =>
                domNodeToTiptap(child)
            );

            if (!content.length) return [{ type: "paragraph" }];

            const node = { type: "paragraph", content };
            if (/^h[1-6]$/.test(tag)) {
                return [{ type: "heading", attrs: { level: Number(tag.slice(1)) }, content }];
            }
            if (tag === "blockquote") {
                return [{ type: "blockquote", content: [{ type: "paragraph", content }] }];
            }
            if (tag === "pre") {
                return [{ type: "codeBlock", content }];
            }
            return [node];
        };

        const convertListItem = (li) => {
            const nestedLists = Array.from(li.children).filter((child) =>
                ["ol", "ul"].includes(child.tagName.toLowerCase())
            );
            const inlineNodes = Array.from(li.childNodes)
                .filter((child) => !(child.nodeType === Node.ELEMENT_NODE && ["ol", "ul"].includes(child.tagName.toLowerCase())))
                .flatMap((child) => domNodeToTiptap(child));
            const content = [{ type: "paragraph", content: inlineNodes }];
            nestedLists.forEach((list) => {
                content.push(...convertBlock(list));
            });
            return content;
        };

        const content = Array.from(doc.body.children).flatMap(convertBlock);
        if (!content.length) return false;

        currentEditor.chain().focus().insertContent(content).run();
        return true;
    };


    /*
    |--------------------------------------------------------------------------
    | Input Change
    |--------------------------------------------------------------------------
    */

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setSuccess("");
        setError("");
    };


    /*
    |--------------------------------------------------------------------------
    | Equation Panel Handlers
    |--------------------------------------------------------------------------
    |
    | openNewEquation - called by the "Equation" toolbar button
    | openEditEquation - called by Mathematics.configure()'s onClick when
    |                    the teacher clicks an equation already in the doc
    | handleEquationInsert - called by EquationPanel on "Insert"; inserts a
    |                        new node when pos is null, otherwise updates
    |                        the existing node at that position
    |
    */

    const openNewEquation = () => {
        setEquationPanel({ target: "content", mode: "inline", latex: "", pos: null });
    };

    const openEditEquation = (mode) => (node, pos) => {
        setEquationPanel({ target: "content", mode, latex: node.attrs.latex || "", pos });
    };

    // Opens the equation panel for a quiz question or option field. Those
    // are plain strings (not Tiptap content), so insertion wraps the
    // chosen LaTeX as "\(...\)" and splices it into that specific string
    // at the field's current cursor position - see insertLatexIntoQuizField.
    const openQuizEquation = (questionIndex, field, optionIndex = null) => {
        setEquationPanel({
            target: "quiz",
            mode: "inline",
            latex: "",
            pos: null,
            quizTarget: { questionIndex, field, optionIndex },
        });
    };

    const insertLatexIntoQuizField = (latex, quizTarget) => {
        const { questionIndex, field, optionIndex } = quizTarget;
        const key = quizFieldKey(questionIndex, field, optionIndex);
        const el = quizFieldRefs.current[key];
        const wrapped = `\\(${latex}\\)`;

        setQuiz((prev) => ({
            ...prev,
            questions: prev.questions.map((question, index) => {
                if (index !== questionIndex) return question;

                if (field === "question") {
                    const current = question.question;
                    const start = el?.selectionStart ?? current.length;
                    const end = el?.selectionEnd ?? current.length;
                    return {
                        ...question,
                        question: current.slice(0, start) + wrapped + current.slice(end),
                    };
                }

                const current = question.options[optionIndex] || "";
                const start = el?.selectionStart ?? current.length;
                const end = el?.selectionEnd ?? current.length;
                const nextOptions = [...question.options];
                nextOptions[optionIndex] = current.slice(0, start) + wrapped + current.slice(end);
                return { ...question, options: nextOptions };
            }),
        }));
    };

    const handleEquationInsert = (latex, mode) => {
        if (equationPanel?.target === "quiz") {
            insertLatexIntoQuizField(latex, equationPanel.quizTarget);
            setEquationPanel(null);
            return;
        }

        if (!editorRef.current) {
            setEquationPanel(null);
            return;
        }

        const chain = editorRef.current.chain().focus();

        if (equationPanel?.pos != null) {
            chain.setNodeSelection(equationPanel.pos);
            if (mode === "block") {
                chain.updateBlockMath({ latex });
            } else {
                chain.updateInlineMath({ latex });
            }
        } else if (mode === "block") {
            chain.insertBlockMath({ latex });
        } else {
            chain.insertInlineMath({ latex });
        }

        chain.run();
        setEquationPanel(null);
    };


// custom toolbar handler — registered once, e.g. via useMemo so the
// module object stays stable across renders
    const editorExtensions = useMemo(() => [
        StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TextStyle,
        Color,
        FontSize,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
        Image,
        Subscript,
        Superscript,
        Mathematics.configure({
            katexOptions: {
                throwOnError: false,
            },
            inlineOptions: {
                onClick: openEditEquation("inline"),
            },
            blockOptions: {
                onClick: openEditEquation("block"),
            },
        }),
    ], []);

    const editor = useEditor({
        extensions: editorExtensions,
        content: "",
        immediatelyRender: false,
        onCreate: ({ editor: createdEditor }) => {
            editorRef.current = createdEditor;
        },
        onDestroy: () => {
            editorRef.current = null;
        },
        onUpdate: handleEditorUpdate,
        editorProps: {
            attributes: {
                class: "tiptap-lesson-content-inner",
            },
            handlePaste: (_view, event) => handlePaste(event),
        },
    });

    useEffect(() => {
        if (!editor || loading || editorHydratedRef.current) return;

        const sourceContent = normalizeLessonContent(
            formData.content
        );

        editor.commands.setContent(sourceContent || "", { emitUpdate: false });
        editorHydratedRef.current = true;
    }, [editor, loading, lessonId]);

    useEffect(() => {
        editorHydratedRef.current = false;
    }, [lessonId]);

    /*
    |--------------------------------------------------------------------------
    | Video Change
    |--------------------------------------------------------------------------
    */

    const handleVideoChange = (event) => {
        const { name, value } = event.target;

        setVideoData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setSuccess("");
        setError("");
    };


    /*
    |--------------------------------------------------------------------------
    | Switch Video Type
    |--------------------------------------------------------------------------
    */

    const handleVideoTypeChange = (type) => {
        setVideoData((prev) => ({
            ...prev,
            type,
            url: "",
            duration: "",
        }));

        setSelectedVideo(null);
        setError("");
        setSuccess("");
    };


    /*
    |--------------------------------------------------------------------------
    | YouTube Video ID
    |--------------------------------------------------------------------------
    */

    const youtubeVideoId = useMemo(() => {
        if (videoData.type !== "youtube") {
            return "";
        }

        const url = videoData.url?.trim();

        if (!url) {
            return "";
        }

        const match = url.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/
        );

        return match?.[1] || "";
    }, [
        videoData.url,
        videoData.type,
    ]);


    /*
    |--------------------------------------------------------------------------
    | YouTube Embed URL
    |--------------------------------------------------------------------------
    */

    const youtubeEmbedUrl = youtubeVideoId
        ? `https://www.youtube.com/embed/${youtubeVideoId}`
        : "";


    /*
    |--------------------------------------------------------------------------
    | Course Material Selection
    |--------------------------------------------------------------------------
    */

    const handleFileChange = (event) => {
        const files = Array.from(
            event.target.files || []
        );

        if (!files.length) {
            return;
        }

        setSelectedFiles((prev) => [
            ...prev,
            ...files,
        ]);

        event.target.value = "";

        setSuccess("");
        setError("");
    };


    /*
    |--------------------------------------------------------------------------
    | Remove Selected Material
    |--------------------------------------------------------------------------
    */

    const removeSelectedFile = (index) => {
        setSelectedFiles((prev) =>
            prev.filter(
                (_, fileIndex) =>
                    fileIndex !== index
            )
        );
    };


    /*
    |--------------------------------------------------------------------------
    | Existing Attachment Remove - UI Only
    |--------------------------------------------------------------------------
    */

    const removeExistingAttachment = (index) => {
        setLesson((prev) => ({
            ...prev,
            attachments:
                prev.attachments?.filter(
                    (_, attachmentIndex) =>
                        attachmentIndex !== index
                ) || [],
        }));

        setSuccess("");
    };


    /*
    |--------------------------------------------------------------------------
    | Video File Selection
    |--------------------------------------------------------------------------
    */

    const handleVideoFileChange = (event) => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
        ];

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {
            setError(
                "Please select a valid MP4, WebM, or MOV video."
            );

            event.target.value = "";
            return;
        }

        setSelectedVideo(file);

        setVideoData((prev) => ({
            ...prev,
            type: "upload",
            url: "",
            duration: "",
        }));

        setError("");
        setSuccess("");

        event.target.value = "";
    };


    /*
    |--------------------------------------------------------------------------
    | Remove Selected Video
    |--------------------------------------------------------------------------
    */

    const removeSelectedVideo = () => {
        setSelectedVideo(null);

        setSuccess("");
        setError("");
    };


    /*
    |--------------------------------------------------------------------------
    | Format File Size
    |--------------------------------------------------------------------------
    */

    const formatFileSize = (bytes) => {
        if (!bytes) {
            return "0 KB";
        }

        const mb =
            bytes /
            (1024 * 1024);

        if (mb >= 1) {
            return `${mb.toFixed(2)} MB`;
        }

        return `${Math.max(
            1,
            Math.round(
                bytes / 1024
            )
        )} KB`;
    };


    /*
    |--------------------------------------------------------------------------
    | Quiz Helpers
    |--------------------------------------------------------------------------
    */

    const updateQuizField = (field, value) => {
        setQuiz((prev) => ({
            ...prev,
            [field]: value,
        }));
        setSuccess("");
        setError("");
    };

    const updateQuestion = (questionIndex, field, value) => {
        setQuiz((prev) => ({
            ...prev,
            questions: prev.questions.map((question, index) =>
                index === questionIndex
                    ? { ...question, [field]: value }
                    : question
            ),
        }));
        setSuccess("");
        setError("");
    };

    const updateQuestionOption = (questionIndex, optionIndex, value) => {
        setQuiz((prev) => ({
            ...prev,
            questions: prev.questions.map((question, index) => {
                if (index !== questionIndex) {
                    return question;
                }

                return {
                    ...question,
                    options: question.options.map((option, currentIndex) =>
                        currentIndex === optionIndex
                            ? value
                            : option
                    ),
                };
            }),
        }));
        setSuccess("");
        setError("");
    };

    const addQuestion = () => {
        setQuiz((prev) => ({
            ...prev,
            questions: [
                ...prev.questions,
                createEmptyQuestion(),
            ],
        }));
    };

    const removeQuestion = (questionIndex) => {
        setQuiz((prev) => ({
            ...prev,
            questions:
                prev.questions.length <= 1
                    ? [createEmptyQuestion()]
                    : prev.questions.filter(
                          (_, index) => index !== questionIndex
                      ),
        }));
    };

    const addOption = (questionIndex) => {
        setQuiz((prev) => ({
            ...prev,
            questions: prev.questions.map((question, index) =>
                index === questionIndex
                    ? {
                          ...question,
                          options: [
                              ...question.options,
                              "",
                          ],
                      }
                    : question
            ),
        }));
    };

    const removeOption = (questionIndex, optionIndex) => {
        setQuiz((prev) => ({
            ...prev,
            questions: prev.questions.map((question, index) => {
                if (index !== questionIndex) {
                    return question;
                }

                if (question.options.length <= 2) {
                    return question;
                }

                const options = question.options.filter(
                    (_, currentIndex) =>
                        currentIndex !== optionIndex
                );

                let correctAnswer = question.correctAnswer;

                if (optionIndex === correctAnswer) {
                    correctAnswer = 0;
                } else if (optionIndex < correctAnswer) {
                    correctAnswer -= 1;
                }

                return {
                    ...question,
                    options,
                    correctAnswer,
                };
            }),
        }));
    };

    const validateQuizBeforeSave = () => {
        if (!quiz.enabled) {
            return true;
        }

        if (!quiz.questions.length) {
            setError("Please add at least one quiz question.");
            return false;
        }

        for (let index = 0; index < quiz.questions.length; index += 1) {
            const question = quiz.questions[index];

            if (!question.question.trim()) {
                setError(`Question ${index + 1} is required.`);
                return false;
            }

            if (question.options.length < 2) {
                setError(`Question ${index + 1} must have at least 2 options.`);
                return false;
            }

            if (question.options.some((option) => !option.trim())) {
                setError(`Please fill all options for question ${index + 1}.`);
                return false;
            }

            if (
                question.correctAnswer < 0 ||
                question.correctAnswer >= question.options.length
            ) {
                setError(`Please select a valid correct answer for question ${index + 1}.`);
                return false;
            }
        }

        return true;
    };


    /*
    |--------------------------------------------------------------------------
    | Save Lesson
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (formData.title.trim().length < 3) {
            setError(
                "Lesson title must be at least 3 characters."
            );
            return;
        }

        if (isCreateMode && !topicId) {
            setError(
                "Unable to determine the lesson topic. Please go back to the curriculum and try again."
            );
            return;
        }

        if (
            videoData.type === "youtube" &&
            videoData.url.trim() &&
            !youtubeVideoId
        ) {
            setError(
                "Please enter a valid YouTube video URL."
            );
            return;
        }

        if (
            videoData.type === "upload" &&
            !selectedVideo &&
            !lesson?.video?.url
        ) {
            setError(
                "Please select a video to upload."
            );
            return;
        }

        if (!validateQuizBeforeSave()) {
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const formPayload =
                new FormData();


            /*
            |--------------------------------------------------------------------------
            | Basic Lesson Data
            |--------------------------------------------------------------------------
            */

            formPayload.append(
                "title",
                formData.title.trim()
            );

            formPayload.append(
                "description",
                formData.description.trim()
            );

            formPayload.append(
                "content",
                typeof formData.content === "string"
                    ? formData.content
                    : JSON.stringify(formData.content)
            );

            if (
                formData.position !== ""
            ) {
                formPayload.append(
                    "position",
                    String(
                        Number(
                            formData.position
                        )
                    )
                );
            }

            formPayload.append(
                "isPreview",
                String(
                    formData.isPreview
                )
            );

            /*
            |--------------------------------------------------------------------------
            | Quiz Data
            |--------------------------------------------------------------------------
            */

            formPayload.append(
                "quiz",
                JSON.stringify({
                    ...quiz,
                    enabled: Boolean(quiz.enabled),
                    passingScore: Number(quiz.passingScore || 0),
                    maxAttempts: Number(quiz.maxAttempts || 1),
                    questions: quiz.enabled
                        ? quiz.questions.map((question) => ({
                              ...question,
                              question: question.question.trim(),
                              options: question.options.map((option) =>
                                  option.trim()
                              ),
                              correctAnswer: Number(question.correctAnswer),
                              points: Number(question.points || 1),
                              explanation:
                                  question.explanation?.trim() || "",
                          }))
                        : [],
                })
            );


            /*
            |--------------------------------------------------------------------------
            | Video Data
            |--------------------------------------------------------------------------
            |
            | IMPORTANT:
            | The backend parser reads `videoData` as JSON.
            | For uploaded videos, the actual file is sent separately
            | using the `video` multipart field.
            |
            */

            if (videoData.type === "youtube") {
                formPayload.append(
                    "videoData",
                    JSON.stringify({
                        type: "youtube",
                        url: videoData.url.trim(),
                        duration:
                            videoData.duration !== ""
                                ? Number(videoData.duration)
                                : 0,
                    })
                );
            }

            if (videoData.type === "upload") {
                formPayload.append(
                    "videoData",
                    JSON.stringify({
                        type: "upload",
                        url: "",
                        duration: 0,
                    })
                );

                if (selectedVideo) {
                    formPayload.append("video", selectedVideo);
                }
            }


            /*
            |--------------------------------------------------------------------------
            | Course Materials
            |--------------------------------------------------------------------------
            */

            selectedFiles.forEach(
                (file) => {
                    formPayload.append(
                        "attachments",
                        file
                    );
                }
            );


            /*
            |--------------------------------------------------------------------------
            | API Request
            |--------------------------------------------------------------------------
            */

            if (isCreateMode) {
                formPayload.append(
                    "topic",
                    topicId
                );

                const response = await createLesson(
                    formPayload
                );

                const createdLesson =
                    response?.data?.data ||
                    response?.data?.lesson ||
                    response?.data ||
                    response?.lesson ||
                    null;

                const createdLessonId =
                    createdLesson?._id ||
                    createdLesson?.id;

                if (!createdLessonId) {
                    throw new Error(
                        "Lesson was created but its ID was not returned."
                    );
                }

                navigate(
                    `/teacher/courses/${courseId}/lessons/${createdLessonId}/edit`,
                    { replace: true }
                );
                return;
            }

            formPayload.append(
                "existingAttachments",
                JSON.stringify(
                    lesson?.attachments || []
                )
            );

            await updateLesson(
                lessonId,
                formPayload
            );

            setSelectedFiles([]);
            setSelectedVideo(null);

            setSuccess(
                "Lesson updated successfully."
            );

            await fetchLesson();

        } catch (err) {
            console.error(
                "Failed to update lesson:",
                err
            );

            setError(
                err?.response?.data
                    ?.message ||
                    "Unable to update lesson."
            );
        } finally {
            setSaving(false);
        }
    };


    /*
    |--------------------------------------------------------------------------
    | Delete Lesson
    |--------------------------------------------------------------------------
    */

    const handleDelete = async () => {
        if (!lesson) {
            return;
        }

        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${lesson.title}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(true);
            setError("");

            await deleteLesson(
                lessonId
            );

            navigate(
                `/teacher/courses/${courseId}/curriculum`
            );

        } catch (err) {
            console.error(
                "Failed to delete lesson:",
                err
            );

            setError(
                err?.response?.data
                    ?.message ||
                    "Unable to delete lesson."
            );

            setDeleting(false);
        }
    };


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="min-h-full bg-slate-50 p-6">
                <div className="flex min-h-[500px] items-center justify-center">
                    <div className="flex items-center gap-3 text-slate-500">

                        <Loader2
                            size={22}
                            className="animate-spin"
                        />

                        <span className="text-sm">
                            Loading lesson...
                        </span>

                    </div>
                </div>
            </div>
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <div className="min-h-full bg-slate-50 p-6">

            {/* Header */}

            <div className="mb-8 flex items-center justify-between">

                <div className="flex items-center gap-4">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/teacher/courses/${courseId}/curriculum`
                            )
                        }
                        className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            p-2.5
                            text-slate-600
                            shadow-sm
                            transition
                            hover:bg-slate-50
                        "
                    >
                        <ArrowLeft
                            size={20}
                        />
                    </button>

                    <div>

                        <h1
                            className="
                                text-2xl
                                font-bold
                                text-slate-900
                            "
                        >
                            {isCreateMode ? "Add Lesson" : "Edit Lesson"}
                        </h1>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            {isCreateMode
                                ? "Create and configure a new lesson"
                                : "Manage lesson content and settings"}
                        </p>

                    </div>

                </div>


                <div
                    className="
                        hidden
                        items-center
                        gap-2
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-2
                        text-sm
                        text-slate-500
                        sm:flex
                    "
                >
                    <FileText
                        size={16}
                    />
                    {isCreateMode ? "New Lesson" : "Lesson"}
                </div>

            </div>


            {/* Error */}

            {error && (
                <div
                    className="
                        mb-6
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-red-200
                        bg-red-50
                        px-4
                        py-3
                        text-sm
                        text-red-700
                    "
                >
                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                        className="font-semibold"
                    >
                        ×
                    </button>
                </div>
            )}


            {/* Success */}

            {success && (
                <div
                    className="
                        mb-6
                        rounded-xl
                        border
                        border-green-200
                        bg-green-50
                        px-4
                        py-3
                        text-sm
                        font-medium
                        text-green-700
                    "
                >
                    {success}
                </div>
            )}


            <form
                onSubmit={
                    handleSubmit
                }
            >

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

                    {/* Main */}

                    <div className="space-y-6">

                        {/* Lesson Information */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-200
                                    px-6
                                    py-5
                                "
                            >
                                <h2
                                    className="
                                        text-lg
                                        font-semibold
                                        text-slate-900
                                    "
                                >
                                    Lesson Information
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Basic information about this lesson.
                                </p>
                            </div>


                            <div className="space-y-5 p-6">

                                {/* Title */}

                                <div>

                                    <label
                                        htmlFor="title"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-medium
                                            text-slate-700
                                        "
                                    >
                                        Lesson Title
                                    </label>

                                    <input
                                        id="title"
                                        type="text"
                                        name="title"
                                        value={
                                            formData.title
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="Enter lesson title"
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-4
                                            py-3
                                            text-sm
                                            text-slate-900
                                            outline-none
                                            transition
                                            placeholder:text-slate-400
                                            focus:border-slate-400
                                            focus:ring-2
                                            focus:ring-slate-100
                                        "
                                    />

                                </div>


                                {/* Description */}

                                <div>

                                    <label
                                        htmlFor="description"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-medium
                                            text-slate-700
                                        "
                                    >
                                        Lesson Description
                                    </label>

                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={5}
                                        value={
                                            formData.description
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="Write a short description about this lesson..."
                                        className="
                                            w-full
                                            resize-none
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-4
                                            py-3
                                            text-sm
                                            leading-6
                                            text-slate-900
                                            outline-none
                                            transition
                                            placeholder:text-slate-400
                                            focus:border-slate-400
                                            focus:ring-2
                                            focus:ring-slate-100
                                        "
                                    />

                                </div>


                                {/* Position */}

                                <div>

                                    <label
                                        htmlFor="position"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-medium
                                            text-slate-700
                                        "
                                    >
                                        Lesson Position

                                        <span
                                            className="
                                                ml-1
                                                text-xs
                                                font-normal
                                                text-slate-400
                                            "
                                        >
                                            Optional
                                        </span>
                                    </label>

                                    <input
                                        id="position"
                                        type="number"
                                        min="1"
                                        name="position"
                                        value={
                                            formData.position
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="Example: 1"
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-4
                                            py-3
                                            text-sm
                                            text-slate-900
                                            outline-none
                                            transition
                                            placeholder:text-slate-400
                                            focus:border-slate-400
                                            focus:ring-2
                                            focus:ring-slate-100
                                        "
                                    />

                                </div>

                            </div>

                        </div>


                        {/* Lesson Content */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-200
                                    px-6
                                    py-5
                                "
                            >

                                <div className="flex items-center gap-3">

                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-slate-100
                                            text-slate-600
                                        "
                                    >
                                        <FileText
                                            size={19}
                                        />
                                    </div>

                                    <div>

                                        <h2
                                            className="
                                                text-lg
                                                font-semibold
                                                text-slate-900
                                            "
                                        >
                                            Lesson Content
                                        </h2>

                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                                text-slate-500
                                            "
                                        >
                                            Write the learning content for this lesson.
                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div className="p-6">

                                <div
                                    className="tiptap-lesson-editor rounded-xl border border-slate-200 bg-white"
                                >
                                    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
                                        <button type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="rounded-lg px-2.5 py-2 text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" title="Undo"><Undo2 size={15} /></button>
                                        <button type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="rounded-lg px-2.5 py-2 text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" title="Redo"><Redo2 size={15} /></button>
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded-lg px-2.5 py-2 text-sm font-bold text-slate-700 hover:bg-white" title="Bold">B</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded-lg px-2.5 py-2 text-sm italic text-slate-700 hover:bg-white" title="Italic">I</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className="rounded-lg px-2.5 py-2 text-sm underline text-slate-700 hover:bg-white" title="Underline">U</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className="rounded-lg px-2.5 py-2 text-sm line-through text-slate-700 hover:bg-white" title="Strike">S</button>
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        {[1, 2, 3].map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
                                                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                                                title={`Heading ${level}`}
                                            >
                                                H{level}
                                            </button>
                                        ))}
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        <select
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                if (value) editor?.chain().focus().setFontSize(value).run();
                                                else editor?.chain().focus().unsetFontSize().run();
                                                event.target.value = "";
                                            }}
                                            defaultValue=""
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            title="Font size"
                                        >
                                            <option value="" disabled>Size</option>
                                            {FONT_SIZES.map((size) => (
                                                <option key={size.label} value={size.value}>{size.label}</option>
                                            ))}
                                        </select>
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Bullet list">• List</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Numbered list">1. List</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Blockquote">❝</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Code block">&lt;/&gt;</button>
                                        <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="rounded-lg px-2.5 py-2 text-slate-700 hover:bg-white" title="Horizontal rule"><Minus size={15} /></button>
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Align left">L</button>
                                        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Align center">C</button>
                                        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Align right">R</button>
                                        <button type="button" onClick={() => {
                                            const url = window.prompt("Link URL");
                                            if (url) editor?.chain().focus().setLink({ href: url }).run();
                                        }} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Add link">Link</button>
                                        <button type="button" onClick={() => {
                                            const url = window.prompt("Image URL");
                                            if (url) editor?.chain().focus().setImage({ src: url, alt: "" }).run();
                                        }} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Insert image">Img</button>
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        <label className="relative flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white" title="Text color">
                                            <span className="pointer-events-none">A</span>
                                            <input
                                                type="color"
                                                onChange={(event) => editor?.chain().focus().setColor(event.target.value).run()}
                                                className="h-4 w-6 cursor-pointer border-0 bg-transparent p-0"
                                            />
                                        </label>
                                        <button type="button" onClick={() => editor?.chain().focus().unsetColor().run()} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-white" title="Clear text color">A/</button>
                                        <label className="relative flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white" title="Highlight color">
                                            <span className="pointer-events-none">HL</span>
                                            <input
                                                type="color"
                                                defaultValue="#fef08a"
                                                onChange={(event) => editor?.chain().focus().toggleHighlight({ color: event.target.value }).run()}
                                                className="h-4 w-6 cursor-pointer border-0 bg-transparent p-0"
                                            />
                                        </label>
                                        <button type="button" onClick={() => editor?.chain().focus().unsetHighlight().run()} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-white" title="Clear highlight">HL/</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleSubscript().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Subscript">X₂</button>
                                        <button type="button" onClick={() => editor?.chain().focus().toggleSuperscript().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white" title="Superscript">X²</button>
                                        <span className="mx-1 h-6 w-px bg-slate-200" />
                                        <button
                                            type="button"
                                            onClick={openNewEquation}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                            title="Insert equation"
                                        >
                                            <Sigma size={13} />
                                            Equation
                                        </button>
                                        <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-white" title="Clear formatting">Clear</button>
                                    </div>

                                    <EditorContent
    editor={editor}
    className='tiptap-lesson-content min-h-[420px] p-5 text-[15px] leading-7 text-slate-800 [&_.tiptap-mathematics-render[data-type="block-math"]]:my-6 [&_.tiptap-mathematics-render[data-type="block-math"]]:overflow-x-auto [&_.tiptap-mathematics-render[data-type="block-math"]]:py-2 [&_.tiptap-mathematics-render]:cursor-pointer'
/>
                                </div>

                                <p className="mt-3 text-xs leading-5 text-slate-400">
                                    Click <span className="font-semibold text-slate-500">Equation</span> to build one with the symbol picker, or type LaTeX directly into the box that opens. Click any existing equation in the lesson to edit it the same way.
                                </p>

                            </div>

                        </div>


                        {/* Quiz */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-200
                                    px-6
                                    py-5
                                "
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="
                                                flex h-10 w-10 items-center justify-center
                                                rounded-xl bg-slate-100 text-slate-600
                                            "
                                        >
                                            <ClipboardList size={19} />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">
                                                Lesson Quiz
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Add questions that students must answer after this lesson.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateQuizField(
                                                "enabled",
                                                !quiz.enabled
                                            )
                                        }
                                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                                            quiz.enabled
                                                ? "bg-[var(--color-primary)]"
                                                : "bg-slate-300"
                                        }`}
                                        aria-label="Toggle lesson quiz"
                                    >
                                        <span
                                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                                                quiz.enabled
                                                    ? "left-6"
                                                    : "left-1"
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {quiz.enabled && (
                                <div className="space-y-6 p-6">

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Quiz Title
                                            </label>
                                            <input
                                                type="text"
                                                value={quiz.title}
                                                onChange={(event) =>
                                                    updateQuizField(
                                                        "title",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Lesson Quiz"
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                                    Passing Score (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={quiz.passingScore}
                                                    onChange={(event) =>
                                                        updateQuizField(
                                                            "passingScore",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                                    Max Attempts
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={quiz.maxAttempts}
                                                    onChange={(event) =>
                                                        updateQuizField(
                                                            "maxAttempts",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Quiz Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={quiz.description}
                                            onChange={(event) =>
                                                updateQuizField(
                                                    "description",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Explain what students should know before starting the quiz..."
                                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                        />
                                    </div>

                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Questions
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Students will see one question at a time.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={addQuestion}
                                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                                            >
                                                <Plus size={15} />
                                                Add Question
                                            </button>
                                        </div>

                                        {quiz.questions.map((question, questionIndex) => (
                                            <div
                                                key={`quiz-question-${questionIndex}`}
                                                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
                                            >
                                                <div className="mb-5 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm">
                                                            {questionIndex + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                Question {questionIndex + 1}
                                                            </p>
                                                            <p className="text-xs text-slate-400">
                                                                Select the correct option for this question.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {quiz.questions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeQuestion(questionIndex)
                                                            }
                                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                            title="Remove question"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="space-y-5">
                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <label className="block text-sm font-medium text-slate-700">
                                                                Question
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => openQuizEquation(questionIndex, "question")}
                                                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                                            >
                                                                <Sigma size={12} />
                                                                Equation
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            ref={(el) => {
                                                                quizFieldRefs.current[quizFieldKey(questionIndex, "question")] = el;
                                                            }}
                                                            rows={3}
                                                            value={question.question}
                                                            onChange={(event) =>
                                                                updateQuestion(
                                                                    questionIndex,
                                                                    "question",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Enter the question... use the Equation button for math"
                                                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                                        />
                                                        {question.question.includes("\\(") && (
                                                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                                <MathText value={question.question} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="mb-3 flex items-center justify-between gap-3">
                                                            <label className="block text-sm font-medium text-slate-700">
                                                                Options
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => addOption(questionIndex)}
                                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                                                            >
                                                                <Plus size={14} />
                                                                Add Option
                                                            </button>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {question.options.map((option, optionIndex) => (
                                                                <div
                                                                    key={`question-${questionIndex}-option-${optionIndex}`}
                                                                    className="flex items-center gap-3"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateQuestion(
                                                                                questionIndex,
                                                                                "correctAnswer",
                                                                                optionIndex
                                                                            )
                                                                        }
                                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition ${
                                                                            Number(question.correctAnswer) === optionIndex
                                                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black"
                                                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                                                                        }`}
                                                                        title="Set as correct answer"
                                                                    >
                                                                        {String.fromCharCode(65 + optionIndex)}
                                                                    </button>

                                                                    <div className="min-w-0 flex-1">
                                                                        <input
                                                                            ref={(el) => {
                                                                                quizFieldRefs.current[
                                                                                    quizFieldKey(questionIndex, "option", optionIndex)
                                                                                ] = el;
                                                                            }}
                                                                            type="text"
                                                                            value={option}
                                                                            onChange={(event) =>
                                                                                updateQuestionOption(
                                                                                    questionIndex,
                                                                                    optionIndex,
                                                                                    event.target.value
                                                                                )
                                                                            }
                                                                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                                                        />
                                                                        {option.includes("\\(") && (
                                                                            <div className="mt-1 px-1 text-sm text-slate-700">
                                                                                <MathText value={option} />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openQuizEquation(questionIndex, "option", optionIndex)
                                                                        }
                                                                        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                                        title="Insert equation"
                                                                    >
                                                                        <Sigma size={15} />
                                                                    </button>

                                                                    {question.options.length > 2 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeOption(
                                                                                    questionIndex,
                                                                                    optionIndex
                                                                                )
                                                                            }
                                                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                                            title="Remove option"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <p className="mt-2 text-xs text-slate-400">
                                                            Click an A/B/C/D button to mark the correct answer.
                                                        </p>
                                                    </div>

                                                    <div className="grid gap-5 md:grid-cols-[160px_1fr]">
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Points
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={question.points}
                                                                onChange={(event) =>
                                                                    updateQuestion(
                                                                        questionIndex,
                                                                        "points",
                                                                        event.target.value
                                                                    )
                                                                }
                                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Explanation
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={question.explanation}
                                                                onChange={(event) =>
                                                                    updateQuestion(
                                                                        questionIndex,
                                                                        "explanation",
                                                                        event.target.value
                                                                    )
                                                                }
                                                                placeholder="Optional explanation shown after submission"
                                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Course Material */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-200
                                    px-6
                                    py-5
                                "
                            >

                                <div className="flex items-center gap-3">

                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-slate-100
                                            text-slate-600
                                        "
                                    >
                                        <FileText
                                            size={19}
                                        />
                                    </div>

                                    <div>

                                        <h2
                                            className="
                                                text-lg
                                                font-semibold
                                                text-slate-900
                                            "
                                        >
                                            Course Material
                                        </h2>

                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                                text-slate-500
                                            "
                                        >
                                            Add PDFs, documents or other lesson resources.
                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div className="space-y-4 p-6">

                                {/* Upload Area */}

                                <label
                                    className="
                                        flex
                                        cursor-pointer
                                        flex-col
                                        items-center
                                        justify-center
                                        rounded-xl
                                        border
                                        border-dashed
                                        border-slate-300
                                        bg-slate-50
                                        p-8
                                        text-center
                                        transition
                                        hover:border-slate-400
                                        hover:bg-slate-100
                                    "
                                >

                                    <Upload
                                        size={30}
                                        className="text-slate-400"
                                    />

                                    <h3
                                        className="
                                            mt-3
                                            text-sm
                                            font-semibold
                                            text-slate-700
                                        "
                                    >
                                        Upload course material
                                    </h3>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                            text-slate-500
                                        "
                                    >
                                        PDF, documents and other supported files
                                    </p>

                                    <span
                                        className="
                                            mt-4
                                            rounded-lg
                                            bg-white
                                            px-4
                                            py-2
                                            text-xs
                                            font-semibold
                                            text-slate-700
                                            shadow-sm
                                        "
                                    >
                                        Choose Files
                                    </span>

                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={
                                            handleFileChange
                                        }
                                    />

                                </label>


                                {/* Existing Attachments */}

                                {lesson?.attachments?.length >
                                    0 && (
                                    <div className="space-y-2">

                                        <p
                                            className="
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wide
                                                text-slate-400
                                            "
                                        >
                                            Uploaded Materials
                                        </p>

                                        {lesson.attachments.map(
                                            (
                                                attachment,
                                                index
                                            ) => (
                                                <div
                                                    key={`${attachment.url}-${index}`}
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-3
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        bg-white
                                                        px-4
                                                        py-3
                                                    "
                                                >

                                                    <div
                                                        className="
                                                            flex
                                                            min-w-0
                                                            items-center
                                                            gap-3
                                                        "
                                                    >

                                                        <div
                                                            className="
                                                                flex
                                                                h-9
                                                                w-9
                                                                shrink-0
                                                                items-center
                                                                justify-center
                                                                rounded-lg
                                                                bg-slate-100
                                                                text-slate-500
                                                            "
                                                        >
                                                            <File
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </div>

                                                        <div className="min-w-0">

                                                            <p
                                                                className="
                                                                    truncate
                                                                    text-sm
                                                                    font-medium
                                                                    text-slate-700
                                                                "
                                                            >
                                                                {
                                                                    attachment.title
                                                                }
                                                            </p>

                                                            <p
                                                                className="
                                                                    mt-0.5
                                                                    text-xs
                                                                    text-slate-400
                                                                "
                                                            >
                                                                {
                                                                    attachment.fileType
                                                                }
                                                            </p>

                                                        </div>

                                                    </div>


                                                    <div className="flex shrink-0 items-center gap-1">

                                                        <a
                                                            href={
                                                                attachment.url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="
                                                                rounded-lg
                                                                p-2
                                                                text-slate-500
                                                                transition
                                                                hover:bg-slate-100
                                                                hover:text-slate-800
                                                            "
                                                        >
                                                            <ExternalLink
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </a>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeExistingAttachment(
                                                                    index
                                                                )
                                                            }
                                                            className="
                                                                rounded-lg
                                                                p-2
                                                                text-slate-400
                                                                transition
                                                                hover:bg-red-50
                                                                hover:text-red-600
                                                            "
                                                        >
                                                            <X
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </button>

                                                    </div>

                                                </div>
                                            )
                                        )}

                                    </div>
                                )}


                                {/* Selected Files */}

                                {selectedFiles.length >
                                    0 && (
                                    <div className="space-y-2">

                                        <p
                                            className="
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wide
                                                text-slate-400
                                            "
                                        >
                                            New Files
                                        </p>

                                        {selectedFiles.map(
                                            (
                                                file,
                                                index
                                            ) => (
                                                <div
                                                    key={`${file.name}-${index}`}
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-3
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        bg-slate-50
                                                        px-4
                                                        py-3
                                                    "
                                                >

                                                    <div className="flex min-w-0 items-center gap-3">

                                                        <FileText
                                                            size={
                                                                18
                                                            }
                                                            className="shrink-0 text-slate-500"
                                                        />

                                                        <div className="min-w-0">

                                                            <p
                                                                className="
                                                                    truncate
                                                                    text-sm
                                                                    font-medium
                                                                    text-slate-700
                                                                "
                                                            >
                                                                {
                                                                    file.name
                                                                }
                                                            </p>

                                                            <p className="text-xs text-slate-400">
                                                                {formatFileSize(
                                                                    file.size
                                                                )}
                                                            </p>

                                                        </div>

                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeSelectedFile(
                                                                index
                                                            )
                                                        }
                                                        className="
                                                            rounded-lg
                                                            p-2
                                                            text-slate-400
                                                            transition
                                                            hover:bg-red-50
                                                            hover:text-red-600
                                                        "
                                                    >
                                                        <X
                                                            size={
                                                                16
                                                            }
                                                        />
                                                    </button>

                                                </div>
                                            )
                                        )}

                                    </div>
                                )}

                            </div>

                        </div>


                        {/* Video Lesson */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-200
                                    px-6
                                    py-5
                                "
                            >

                                <div className="flex items-center gap-3">

                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-slate-100
                                            text-slate-600
                                        "
                                    >
                                        <Video
                                            size={19}
                                        />
                                    </div>

                                    <div>

                                        <h2
                                            className="
                                                text-lg
                                                font-semibold
                                                text-slate-900
                                            "
                                        >
                                            Video Lesson
                                        </h2>

                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                                text-slate-500
                                            "
                                        >
                                            Add a YouTube video or upload a lesson video.
                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div className="space-y-5 p-6">

                                {/* Video Source */}

                                <div>

                                    <label
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-medium
                                            text-slate-700
                                        "
                                    >
                                        Video Source
                                    </label>

                                    <div className="grid grid-cols-2 gap-3">

                                        {/* YouTube */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleVideoTypeChange(
                                                    "youtube"
                                                )
                                            }
                                            className={`
                                                flex
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                border
                                                px-4
                                                py-3
                                                text-sm
                                                font-semibold
                                                transition
                                                ${
                                                    videoData.type ===
                                                    "youtube"
                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black"
                                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                }
                                            `}
                                        >
                                            <Play
                                                size={
                                                    18
                                                }
                                            />
                                            YouTube
                                        </button>


                                        {/* Upload */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleVideoTypeChange(
                                                    "upload"
                                                )
                                            }
                                            className={`
                                                flex
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                border
                                                px-4
                                                py-3
                                                text-sm
                                                font-semibold
                                                transition
                                                ${
                                                    videoData.type ===
                                                    "upload"
                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black"
                                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                }
                                            `}
                                        >
                                            <Upload
                                                size={
                                                    17
                                                }
                                            />
                                            Upload
                                        </button>

                                    </div>

                                </div>


                                {/* YouTube */}

                                {videoData.type ===
                                    "youtube" && (
                                    <div className="space-y-5">

                                        <div>

                                            <label
                                                htmlFor="videoUrl"
                                                className="
                                                    mb-2
                                                    block
                                                    text-sm
                                                    font-medium
                                                    text-slate-700
                                                "
                                            >
                                                YouTube Video URL
                                            </label>

                                            <input
                                                id="videoUrl"
                                                type="url"
                                                name="url"
                                                value={
                                                    videoData.url
                                                }
                                                onChange={
                                                    handleVideoChange
                                                }
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                className="
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-white
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-slate-900
                                                    outline-none
                                                    transition
                                                    placeholder:text-slate-400
                                                    focus:border-slate-400
                                                    focus:ring-2
                                                    focus:ring-slate-100
                                                "
                                            />

                                            {youtubeVideoId && (
                                                <p
                                                    className="
                                                        mt-2
                                                        text-xs
                                                        font-medium
                                                        text-green-600
                                                    "
                                                >
                                                    ✓ Valid YouTube video detected
                                                </p>
                                            )}

                                        </div>


                                        {/* Preview */}

                                        {youtubeEmbedUrl && (
                                            <div>

                                                <div className="mb-2 flex items-center justify-between">

                                                    <p
                                                        className="
                                                            text-sm
                                                            font-medium
                                                            text-slate-700
                                                        "
                                                    >
                                                        Video Preview
                                                    </p>

                                                    <a
                                                        href={
                                                            videoData.url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="
                                                            flex
                                                            items-center
                                                            gap-1
                                                            text-xs
                                                            font-medium
                                                            text-slate-500
                                                            hover:text-slate-900
                                                        "
                                                    >
                                                        Open YouTube
                                                        <ExternalLink
                                                            size={
                                                                13
                                                            }
                                                        />
                                                    </a>

                                                </div>

                                                <div
                                                    className="
                                                        aspect-video
                                                        overflow-hidden
                                                        rounded-xl
                                                        bg-black
                                                    "
                                                >
                                                    <iframe
                                                        src={
                                                            youtubeEmbedUrl
                                                        }
                                                        title="YouTube video preview"
                                                        className="
                                                            h-full
                                                            w-full
                                                        "
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                    />
                                                </div>

                                            </div>
                                        )}

                                    </div>
                                )}


                                {/* Upload Video */}

                                {videoData.type ===
                                    "upload" && (
                                    <div className="space-y-4">

                                        <label
                                            className="
                                                flex
                                                cursor-pointer
                                                flex-col
                                                items-center
                                                justify-center
                                                rounded-xl
                                                border
                                                border-dashed
                                                border-slate-300
                                                bg-slate-50
                                                p-8
                                                text-center
                                                transition
                                                hover:border-slate-400
                                                hover:bg-slate-100
                                            "
                                        >

                                            <Upload
                                                size={
                                                    30
                                                }
                                                className="text-slate-400"
                                            />

                                            <h3
                                                className="
                                                    mt-3
                                                    text-sm
                                                    font-semibold
                                                    text-slate-700
                                                "
                                            >
                                                Upload lesson video
                                            </h3>

                                            <p
                                                className="
                                                    mt-1
                                                    text-xs
                                                    text-slate-500
                                                "
                                            >
                                                MP4, WebM or MOV
                                            </p>

                                            <span
                                                className="
                                                    mt-4
                                                    rounded-lg
                                                    bg-white
                                                    px-4
                                                    py-2
                                                    text-xs
                                                    font-semibold
                                                    text-slate-700
                                                    shadow-sm
                                                "
                                            >
                                                Choose Video
                                            </span>

                                            <input
                                                type="file"
                                                accept="video/mp4,video/webm,video/quicktime"
                                                className="hidden"
                                                onChange={
                                                    handleVideoFileChange
                                                }
                                            />

                                        </label>


                                        {/* New Video */}

                                        {selectedVideo && (
                                            <div
                                                className="
                                                    flex
                                                    items-center
                                                    justify-between
                                                    gap-3
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-white
                                                    px-4
                                                    py-3
                                                "
                                            >

                                                <div className="flex min-w-0 items-center gap-3">

                                                    <div
                                                        className="
                                                            flex
                                                            h-9
                                                            w-9
                                                            shrink-0
                                                            items-center
                                                            justify-center
                                                            rounded-lg
                                                            bg-slate-100
                                                            text-slate-500
                                                        "
                                                    >
                                                        <Video
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </div>

                                                    <div className="min-w-0">

                                                        <p
                                                            className="
                                                                truncate
                                                                text-sm
                                                                font-medium
                                                                text-slate-700
                                                            "
                                                        >
                                                            {
                                                                selectedVideo.name
                                                            }
                                                        </p>

                                                        <p className="text-xs text-slate-400">
                                                            {formatFileSize(
                                                                selectedVideo.size
                                                            )}
                                                        </p>

                                                    </div>

                                                </div>


                                                <button
                                                    type="button"
                                                    onClick={
                                                        removeSelectedVideo
                                                    }
                                                    className="
                                                        rounded-lg
                                                        p-2
                                                        text-slate-400
                                                        transition
                                                        hover:bg-red-50
                                                        hover:text-red-600
                                                    "
                                                >
                                                    <X
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>

                                            </div>
                                        )}


                                        {/* Existing Uploaded Video */}

                                        {!selectedVideo &&
                                            lesson?.video
                                                ?.url &&
                                            !/youtube\.com|youtu\.be/i.test(
                                                lesson.video.url
                                            ) && (
                                                <div
                                                    className="
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        bg-slate-50
                                                        p-4
                                                    "
                                                >

                                                    <div className="flex items-center justify-between gap-3">

                                                        <div className="flex min-w-0 items-center gap-3">

                                                            <div
                                                                className="
                                                                    flex
                                                                    h-9
                                                                    w-9
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-lg
                                                                    bg-white
                                                                    text-slate-500
                                                                "
                                                            >
                                                                <Video
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="min-w-0">

                                                                <p className="text-sm font-medium text-slate-700">
                                                                    Existing uploaded video
                                                                </p>

                                                                <p className="truncate text-xs text-slate-400">
                                                                    {
                                                                        lesson
                                                                            .video
                                                                            .url
                                                                    }
                                                                </p>

                                                            </div>

                                                        </div>


                                                        <a
                                                            href={
                                                                lesson
                                                                    .video
                                                                    .url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="
                                                                shrink-0
                                                                rounded-lg
                                                                p-2
                                                                text-slate-500
                                                                transition
                                                                hover:bg-white
                                                                hover:text-slate-900
                                                            "
                                                        >
                                                            <ExternalLink
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </a>

                                                    </div>

                                                </div>
                                            )}

                                    </div>
                                )}

                            </div>

                        </div>

                    </div>


                    {/* Sidebar */}

                    <div className="space-y-6">

                        {/* Lesson Settings */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-200
                                    px-5
                                    py-4
                                "
                            >

                                <h2
                                    className="
                                        font-semibold
                                        text-slate-900
                                    "
                                >
                                    Lesson Settings
                                </h2>

                            </div>


                            <div className="space-y-4 p-5">

                                {/* Preview */}

                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-slate-50
                                        p-4
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            gap-3
                                        "
                                    >

                                        <div className="flex items-center gap-3">

                                            <div
                                                className="
                                                    flex
                                                    h-9
                                                    w-9
                                                    items-center
                                                    justify-center
                                                    rounded-lg
                                                    bg-white
                                                    text-slate-500
                                                "
                                            >
                                                {formData.isPreview ? (
                                                    <Eye
                                                        size={
                                                            17
                                                        }
                                                    />
                                                ) : (
                                                    <EyeOff
                                                        size={
                                                            17
                                                        }
                                                    />
                                                )}
                                            </div>

                                            <div>

                                                <p
                                                    className="
                                                        text-sm
                                                        font-medium
                                                        text-slate-800
                                                    "
                                                >
                                                    Preview Lesson
                                                </p>

                                                <p
                                                    className="
                                                        mt-0.5
                                                        text-xs
                                                        text-slate-500
                                                    "
                                                >
                                                    Available before enrollment
                                                </p>

                                            </div>

                                        </div>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData(
                                                    (
                                                        prev
                                                    ) => ({
                                                        ...prev,
                                                        isPreview:
                                                            !prev.isPreview,
                                                    })
                                                )
                                            }
                                            className={`
                                                relative
                                                h-6
                                                w-11
                                                rounded-full
                                                transition
                                                ${
                                                    formData.isPreview
                                                        ? "bg-[var(--color-primary)]"
                                                        : "bg-slate-300"
                                                }
                                            `}
                                        >

                                            <span
                                                className={`
                                                    absolute
                                                    top-1
                                                    h-4
                                                    w-4
                                                    rounded-full
                                                    bg-white
                                                    shadow-sm
                                                    transition
                                                    ${
                                                        formData.isPreview
                                                            ? "left-6"
                                                            : "left-1"
                                                    }
                                                `}
                                            />

                                        </button>

                                    </div>

                                </div>


                                {/* Status */}

                                <div>

                                    <label
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-medium
                                            text-slate-700
                                        "
                                    >
                                        Status
                                    </label>

                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-slate-50
                                            px-4
                                            py-3
                                            text-sm
                                            font-medium
                                            text-slate-600
                                        "
                                    >
                                        {isCreateMode
                                            ? "Draft"
                                            : lesson?.status
                                                ? lesson.status
                                                  .charAt(
                                                      0
                                                  )
                                                  .toUpperCase() +
                                                      lesson.status.slice(
                                                          1
                                                      )
                                                : "Draft"}
                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* Actions */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                p-5
                                shadow-sm
                            "
                        >

                            <button
                                type="submit"
                                disabled={
                                    saving ||
                                    !formData.title.trim()
                                }
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-[var(--color-primary)]
                                    px-5
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-black
                                    shadow-sm
                                    transition
                                    hover:opacity-90
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >

                                {saving ? (
                                    <Loader2
                                        size={
                                            17
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save
                                        size={
                                            17
                                        }
                                    />
                                )}

                                {saving
                                    ? "Saving..."
                                    : isCreateMode
                                      ? "Create Lesson"
                                      : "Save Lesson"}

                            </button>


                            {!isCreateMode && (
                                <button
                                    type="button"
                                    onClick={
                                        handleDelete
                                    }
                                    disabled={
                                        deleting
                                    }
                                className="
                                    mt-3
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-red-200
                                    bg-white
                                    px-5
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-red-600
                                    transition
                                    hover:bg-red-50
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >

                                {deleting ? (
                                    <Loader2
                                        size={
                                            17
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Trash2
                                        size={
                                            17
                                        }
                                    />
                                )}

                                    {deleting
                                        ? "Deleting..."
                                        : "Delete Lesson"}

                                </button>
                            )}

                        </div>

                    </div>

                </div>

            </form>

            {equationPanel && (
                <EquationPanel
                    initialLatex={equationPanel.latex}
                    initialMode={equationPanel.mode}
                    allowBlock={equationPanel.target !== "quiz"}
                    onCancel={() => setEquationPanel(null)}
                    onInsert={handleEquationInsert}
                />
            )}

        </div>
    );
}


export default LessonEditor;