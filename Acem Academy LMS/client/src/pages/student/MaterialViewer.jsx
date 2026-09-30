import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    FileText,
    Loader2,
    Minus,
    Plus,
    RotateCcw,
} from "lucide-react";
import axiosInstance from "@/api/axios";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

const MaterialViewer = () => {
    const { lessonId } = useParams();
    const [searchParams] = useSearchParams();

    const attachmentIndex = Number(
        searchParams.get("attachment") || 0
    );

    const enrollmentId = searchParams.get("enrollment") || "";

    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await axiosInstance.get(
                    `/lessons/${lessonId}`
                );

                /*
                |------------------------------------------------------------------
                | API Response
                |------------------------------------------------------------------
                |
                | ApiResponse wraps the actual lesson inside `data`.
                | Keep a small fallback here so the viewer remains compatible
                | if the response is returned without the wrapper.
                |
                */

                const lessonData =
                    response?.data?.data ||
                    response?.data?.lesson ||
                    response?.data;

                setLesson(lessonData);
            } catch (err) {
                console.error("Failed to fetch lesson material:", err);

                setError(
                    err?.response?.data?.message ||
                        "Unable to load this course material."
                );
            } finally {
                setLoading(false);
            }
        };

        if (lessonId) {
            fetchLesson();
        }
    }, [lessonId]);

    const attachment = useMemo(() => {
        return lesson?.attachments?.[attachmentIndex] || null;
    }, [lesson, attachmentIndex]);

    const isPdf =
        attachment?.fileType?.toLowerCase().includes("pdf") ||
        attachment?.url?.toLowerCase().includes(".pdf");

    const handleDocumentLoad = ({ numPages: totalPages }) => {
        setNumPages(totalPages);
        setPageNumber(1);
    };

    const handlePrevious = () => {
        setPageNumber((prev) => Math.max(prev - 1, 1));
    };

    const handleNext = () => {
        setPageNumber((prev) => Math.min(prev + 1, numPages));
    };

    const zoomIn = () => {
        setScale((value) => Math.min(Number((value + 0.1).toFixed(2)), 1.8));
    };

    const zoomOut = () => {
        setScale((value) => Math.max(Number((value - 0.1).toFixed(2)), 0.6));
    };

    const resetZoom = () => {
        setScale(1);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                    <Loader2
                        size={18}
                        className="animate-spin text-[var(--color-primary)]"
                    />
                    Loading material...
                </div>
            </div>
        );
    }

    if (error || !lesson || !attachment?.url) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
                <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                        <FileText
                            size={23}
                            className="text-[var(--color-primary)]"
                        />
                    </div>

                    <h1 className="mt-5 text-lg font-bold">
                        Material unavailable
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                        {error || "This material could not be found."}
                    </p>

                    <Link
                        to={
                            enrollmentId
                                ? `/student/learning/${enrollmentId}`
                                : -1
                        }
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
                    >
                        <ArrowLeft size={16} />
                        Back to Lesson
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#0b0b0b] text-white">
            {/* Header */}
            <header className="shrink-0 border-b border-[var(--color-border)] bg-black">
                <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
                    <Link
                        to={
                            enrollmentId
                                ? `/student/learning/${enrollmentId}`
                                : -1
                        }
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5"
                    >
                        <ArrowLeft size={17} />
                        <span className="hidden sm:inline">
                            Back to Lesson
                        </span>
                    </Link>

                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                            Course Material
                        </p>
                    </div>
                </div>
            </header>

            {/* Viewer */}
            <main className="min-h-0 flex-1 overflow-hidden">
                {isPdf ? (
                    <div className="flex h-full min-h-0 flex-col">
                        {/* Toolbar */}
                        <div className="flex shrink-0 items-center justify-center border-b border-[var(--color-border)] bg-[#111111] px-4 py-3">
                            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-black p-1">
                                <button
                                    type="button"
                                    onClick={zoomOut}
                                    disabled={scale <= 0.6}
                                    className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label="Zoom out"
                                >
                                    <Minus size={17} />
                                </button>

                                <button
                                    type="button"
                                    onClick={resetZoom}
                                    className="flex min-w-16 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-white transition hover:bg-white/5"
                                >
                                    <RotateCcw size={14} />
                                    {Math.round(scale * 100)}%
                                </button>

                                <button
                                    type="button"
                                    onClick={zoomIn}
                                    disabled={scale >= 1.8}
                                    className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label="Zoom in"
                                >
                                    <Plus size={17} />
                                </button>
                            </div>

                          {numPages > 0 && (
    <div className="absolute right-4 hidden items-center gap-2 text-xs text-[var(--color-text-muted)] sm:flex">

        <button
            type="button"
            onClick={handlePrevious}
            disabled={pageNumber <= 1}
            className="
                inline-flex items-center gap-2
                rounded-lg
                border border-[var(--color-border)]
                bg-[var(--color-surface)]
                px-4 py-2.5
                text-sm font-medium
                text-white
                transition-all duration-200
                hover:border-[var(--color-primary)]
                hover:bg-[var(--color-primary)]
                hover:text-black
                disabled:cursor-not-allowed
                disabled:opacity-35
                disabled:hover:border-[var(--color-border)]
                disabled:hover:bg-[var(--color-surface)]
                disabled:hover:text-white
            "
        >
            <ChevronLeft size={17} />
            <span>Previous</span>
        </button>

        <span className="min-w-20 text-center">
            {pageNumber} / {numPages}
        </span>

        <button
            type="button"
            onClick={handleNext}
            disabled={pageNumber >= numPages}
            className="
                inline-flex items-center gap-2
                rounded-lg
                border border-[var(--color-primary)]
                bg-[var(--color-primary)]
                px-4 py-2.5
                text-sm font-semibold
                text-black
                transition-all duration-200
                hover:brightness-95
                disabled:cursor-not-allowed
                disabled:opacity-35
                disabled:hover:brightness-100
            "
        >
            <span>Next</span>
            <ChevronRight size={17} />
        </button>

    </div>
)}
                        </div>

                        {/* PDF canvas */}
                        <div className="min-h-0 flex-1 overflow-auto bg-[#1a1a1a] px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-8">
                            <div className="mx-auto flex w-fit min-w-full justify-center">
                                <Document
                                    file={attachment.url}
                                    onLoadSuccess={handleDocumentLoad}
                                    loading={
                                        <div className="flex min-h-40 items-center justify-center text-sm text-[var(--color-text-muted)]">
                                            <div className="flex items-center gap-2">
                                                <Loader2
                                                    size={17}
                                                    className="animate-spin text-[var(--color-primary)]"
                                                />
                                                Loading PDF...
                                            </div>
                                        </div>
                                    }
                                    error={
                                        <div className="flex min-h-40 items-center justify-center text-sm text-red-400">
                                            Unable to render this PDF.
                                        </div>
                                    }
                                >
                                    <div className="overflow-hidden rounded-sm shadow-2xl">
                                        <Page
                                            pageNumber={pageNumber}
                                            scale={scale}
                                            renderAnnotationLayer
                                            renderTextLayer
                                        />
                                    </div>
                                </Document>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center p-6">
                        <div className="max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                            <FileText
                                size={40}
                                className="mx-auto text-[var(--color-primary)]"
                            />
                            <h2 className="mt-4 text-lg font-bold">
                                Preview unavailable
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                                This material type cannot be previewed here.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MaterialViewer;
