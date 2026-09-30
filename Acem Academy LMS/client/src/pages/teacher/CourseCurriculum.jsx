import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  BookOpen,
  Layers,
  ListTree,
  FileText,
  X,
  Loader2,
} from "lucide-react";

import {
  getSubCourses,
  createSubCourse,
  updateSubCourse,
  deleteSubCourse,
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getLessons,
  updateLesson,
  deleteLesson,
} from "@/api/curriculum.api";


function CourseCurriculum() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [subCourses, setSubCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedSubCourses, setExpandedSubCourses] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});

  const [modal, setModal] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    position: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | Fetch Curriculum
  |--------------------------------------------------------------------------
  */

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      setError("");

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

      setSubCourses(
        subCourseResponse?.data || subCourseResponse || []
      );

      setChapters(
        chapterResponse?.data || chapterResponse || []
      );

      setTopics(
        topicResponse?.data || topicResponse || []
      );

      setLessons(
        lessonResponse?.data || lessonResponse || []
      );

    } catch (err) {
      console.error("Failed to fetch curriculum:", err);

      setError(
        err?.response?.data?.message ||
        "Unable to load course curriculum."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCurriculum();
  }, [courseId]);


  /*
  |--------------------------------------------------------------------------
  | Filter Current Course
  |--------------------------------------------------------------------------
  */

  const courseSubCourses = useMemo(() => {
    return subCourses
      .filter((subCourse) => {
        const courseReference =
          subCourse?.course?._id ||
          subCourse?.course;

        return String(courseReference) === String(courseId);
      })
      .sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      );
  }, [subCourses, courseId]);


  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const getChapterItems = (subCourseId) => {
    return chapters
      .filter((chapter) => {
        const reference =
          chapter?.subCourse?._id ||
          chapter?.subCourse;

        return String(reference) === String(subCourseId);
      })
      .sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      );
  };


  const getTopicItems = (chapterId) => {
    return topics
      .filter((topic) => {
        const reference =
          topic?.chapter?._id ||
          topic?.chapter;

        return String(reference) === String(chapterId);
      })
      .sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      );
  };


  const getLessonItems = (topicId) => {
    return lessons
      .filter((lesson) => {
        const reference =
          lesson?.topic?._id ||
          lesson?.topic;

        return String(reference) === String(topicId);
      })
      .sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      );
  };


  /*
  |--------------------------------------------------------------------------
  | Expand / Collapse
  |--------------------------------------------------------------------------
  */

  const toggleSubCourse = (id) => {
    setExpandedSubCourses((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };


  const toggleChapter = (id) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };


  const toggleTopic = (id) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };


  /*
  |--------------------------------------------------------------------------
  | Add Lesson
  |--------------------------------------------------------------------------
  */

  const handleAddLesson = (topicId) => {
    navigate(
      `/teacher/courses/${courseId}/lessons/new/edit?topicId=${topicId}`
    );
  };


  /*
  |--------------------------------------------------------------------------
  | Modal
  |--------------------------------------------------------------------------
  */

  const openCreateModal = (
    type,
    parentId = null
  ) => {
    setModal({
      mode: "create",
      type,
      parentId,
    });

    setFormData({
      title: "",
      description: "",
      position: "",
    });
  };


  const openEditModal = (
    type,
    item
  ) => {
    setModal({
      mode: "edit",
      type,
      item,
    });

    setFormData({
      title: item?.title || "",
      description: item?.description || "",
      position: item?.position || "",
    });
  };


  const closeModal = () => {
    if (saving) return;

    setModal(null);

    setFormData({
      title: "",
      description: "",
      position: "",
    });
  };


  /*
  |--------------------------------------------------------------------------
  | Form Change
  |--------------------------------------------------------------------------
  */

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    try {
      setSaving(true);

      const type = modal.type;

      const position =
        formData.position === ""
          ? undefined
          : Number(formData.position);

      /*
      |----------------------------------------------------------------------
      | Create
      |----------------------------------------------------------------------
      */

      if (modal.mode === "create") {

        if (type === "subCourse") {
          await createSubCourse({
            title: formData.title.trim(),
            description: formData.description.trim(),
            course: courseId,
            ...(position
              ? { position }
              : {}),
          });
        }

        if (type === "chapter") {
          await createChapter({
            title: formData.title.trim(),
            description: formData.description.trim(),
            subCourse: modal.parentId,
            ...(position
              ? { position }
              : {}),
          });
        }

        if (type === "topic") {
          await createTopic({
            title: formData.title.trim(),
            description: formData.description.trim(),
            chapter: modal.parentId,
            ...(position
              ? { position }
              : {}),
          });
        }

      }

      /*
      |----------------------------------------------------------------------
      | Edit
      |----------------------------------------------------------------------
      */

      if (modal.mode === "edit") {

        const itemId = modal.item._id;

        const payload = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          ...(position
            ? { position }
            : {}),
        };

        if (type === "subCourse") {
          await updateSubCourse(
            itemId,
            payload
          );
        }

        if (type === "chapter") {
          await updateChapter(
            itemId,
            payload
          );
        }

        if (type === "topic") {
          await updateTopic(
            itemId,
            payload
          );
        }

        if (type === "lesson") {
          await updateLesson(
            itemId,
            payload
          );
        }
      }

      closeModal();

      await fetchCurriculum();

    } catch (err) {
      console.error(
        "Failed to save curriculum item:",
        err
      );

      setError(
        err?.response?.data?.message ||
        "Unable to save curriculum item."
      );

    } finally {
      setSaving(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (
    type,
    item
  ) => {

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item._id);
      setError("");

      if (type === "subCourse") {
        await deleteSubCourse(item._id);
      }

      if (type === "chapter") {
        await deleteChapter(item._id);
      }

      if (type === "topic") {
        await deleteTopic(item._id);
      }

      if (type === "lesson") {
        await deleteLesson(item._id);
      }

      await fetchCurriculum();

    } catch (err) {
      console.error(
        "Failed to delete curriculum item:",
        err
      );

      setError(
        err?.response?.data?.message ||
        "Unable to delete curriculum item."
      );

    } finally {
      setDeletingId(null);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | Labels
  |--------------------------------------------------------------------------
  */

  const getModalTitle = () => {

    if (!modal) return "";

    const labels = {
      subCourse: "Sub Course",
      chapter: "Chapter",
      topic: "Topic",
      lesson: "Lesson",
    };

    const label = labels[modal.type];

    return modal.mode === "create"
      ? `Add ${label}`
      : `Edit ${label}`;
  };


  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="p-6">

        <div className="flex min-h-[500px] items-center justify-center">

          <div className="flex items-center gap-3 text-slate-500">

            <Loader2
              size={22}
              className="animate-spin"
            />

            <span className="text-sm">
              Loading curriculum...
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

  const modalLabel = modal
    ? {
        subCourse: "Sub Course",
        chapter: "Chapter",
        topic: "Topic",
        lesson: "Lesson",
      }[modal.type]
    : "";

  const modalParentLabel =
    modal?.mode === "create"
      ? {
          subCourse: "This will be added to the course.",
          chapter: "This will be added inside the selected sub course.",
          topic: "This will be added inside the selected chapter.",
          lesson: "This will be added inside the selected topic.",
        }[modal.type]
      : "Update the information below and save your changes.";

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Loading curriculum...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={() => navigate(`/teacher/courses/${courseId}`)}
            className="
              mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center
              rounded-xl border border-slate-200 bg-white text-slate-600
              shadow-sm transition hover:border-slate-300 hover:bg-slate-50
            "
            aria-label="Back to course"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Course Curriculum
              </h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {courseSubCourses.length}{" "}
                {courseSubCourses.length === 1 ? "Section" : "Sections"}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Build and manage your course structure
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal("subCourse")}
          className="
            inline-flex items-center justify-center gap-2 rounded-xl
            bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold
            text-black shadow-sm transition hover:opacity-90
            sm:w-auto
          "
        >
          <Plus size={18} />
          Add Sub Course
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="
            mb-6 flex items-start justify-between gap-4 rounded-xl border
            border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700
          "
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 font-semibold text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Course Summary */}
      <section
        className="
          mb-6 overflow-hidden rounded-2xl border border-slate-200
          bg-white shadow-sm
        "
      >
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="
                flex h-12 w-12 shrink-0 items-center justify-center
                rounded-2xl bg-[var(--color-primary)]/15 text-slate-800
              "
            >
              <BookOpen size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Course
              </p>
              <h2 className="mt-1 truncate text-lg font-bold text-slate-900">
                Curriculum Structure
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Course ID: {courseId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-400">
                Sub Courses
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {courseSubCourses.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-400">
                Chapters
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {courseSubCourses.reduce(
                  (total, subCourse) =>
                    total + getChapterItems(subCourse._id).length,
                  0
                )}
              </p>
            </div>

            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:block">
              <p className="text-[11px] font-medium text-slate-400">
                Lessons
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {courseSubCourses.reduce(
                  (total, subCourse) =>
                    total +
                    getChapterItems(subCourse._id).reduce(
                      (chapterTotal, chapter) =>
                        chapterTotal +
                        getTopicItems(chapter._id).reduce(
                          (topicTotal, topic) =>
                            topicTotal + getLessonItems(topic._id).length,
                          0
                        ),
                      0
                    ),
                  0
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section
        className="
          overflow-hidden rounded-2xl border border-slate-200 bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex flex-col gap-3 border-b border-slate-200 px-5 py-5
            sm:flex-row sm:items-center sm:justify-between sm:px-6
          "
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              Curriculum Structure
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Organize your course into sub courses, chapters, topics and lessons.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span className="hidden sm:inline">Click a row to expand</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {lessons.length} lessons
            </span>
          </div>
        </div>

        {courseSubCourses.length === 0 ? (
          <div className="px-6 py-16 text-center sm:py-20">
            <div
              className="
                mx-auto flex h-16 w-16 items-center justify-center
                rounded-2xl bg-slate-100 text-slate-500
              "
            >
              <Layers size={28} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              No Sub Courses Yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Start building your curriculum by adding your first sub course.
              You can then add chapters, topics and lessons inside it.
            </p>

            <button
              type="button"
              onClick={() => openCreateModal("subCourse")}
              className="
                mt-5 inline-flex items-center gap-2 rounded-xl
                bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold
                text-black transition hover:opacity-90
              "
            >
              <Plus size={18} />
              Add Sub Course
            </button>
          </div>
        ) : (
          <div className="p-3 sm:p-5">
            <div className="space-y-4">
              {courseSubCourses.map((subCourse, subCourseIndex) => {
                const subCourseId = subCourse._id;
                const chapterItems = getChapterItems(subCourseId);
                const isSubCourseExpanded =
                  !!expandedSubCourses[subCourseId];

                const topicCount = chapterItems.reduce(
                  (total, chapter) =>
                    total + getTopicItems(chapter._id).length,
                  0
                );

                const lessonCount = chapterItems.reduce(
                  (total, chapter) =>
                    total +
                    getTopicItems(chapter._id).reduce(
                      (topicTotal, topic) =>
                        topicTotal + getLessonItems(topic._id).length,
                      0
                    ),
                  0
                );

                return (
                  <div
                    key={subCourseId}
                    className="
                      overflow-hidden rounded-2xl border border-slate-200
                      bg-white shadow-sm
                    "
                  >
                    {/* Sub Course Header */}
                    <div
                      className="
                        flex flex-col gap-4 bg-slate-50/80 p-4
                        sm:p-5 lg:flex-row lg:items-center lg:justify-between
                      "
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSubCourse(subCourseId)}
                          className="
                            mt-1 flex h-8 w-8 shrink-0 items-center
                            justify-center rounded-lg text-slate-500
                            transition hover:bg-white hover:text-slate-800
                          "
                          aria-label={
                            isSubCourseExpanded
                              ? "Collapse sub course"
                              : "Expand sub course"
                          }
                        >
                          {isSubCourseExpanded ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </button>

                        <div
                          className="
                            flex h-11 w-11 shrink-0 items-center
                            justify-center rounded-xl bg-white
                            text-slate-700 shadow-sm ring-1 ring-slate-100
                          "
                        >
                          <Layers size={20} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="
                                rounded-md bg-[var(--color-primary)]/15 px-2
                                py-1 text-[10px] font-bold uppercase
                                tracking-wider text-slate-600
                              "
                            >
                              Section {String(subCourseIndex + 1).padStart(2, "0")}
                            </span>

                            <span className="text-[11px] text-slate-400">
                              Position {subCourse.position || subCourseIndex + 1}
                            </span>
                          </div>

                          <h3 className="mt-1.5 truncate text-base font-bold text-slate-900 sm:text-lg">
                            {subCourse.title}
                          </h3>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{chapterItems.length} chapters</span>
                            <span className="text-slate-300">•</span>
                            <span>{topicCount} topics</span>
                            <span className="text-slate-300">•</span>
                            <span>{lessonCount} lessons</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openCreateModal("chapter", subCourseId)
                          }
                          className="
                            inline-flex items-center gap-1.5 rounded-lg
                            border border-slate-200 bg-white px-3 py-2
                            text-xs font-semibold text-slate-700 shadow-sm
                            transition hover:border-slate-300 hover:bg-slate-50
                          "
                        >
                          <Plus size={15} />
                          Chapter
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal("subCourse", subCourse)
                          }
                          className="
                            rounded-lg p-2 text-slate-400 transition
                            hover:bg-white hover:text-slate-800
                          "
                          title="Edit Sub Course"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete("subCourse", subCourse)
                          }
                          disabled={deletingId === subCourseId}
                          className="
                            rounded-lg p-2 text-slate-400 transition
                            hover:bg-white hover:text-red-600
                            disabled:opacity-50
                          "
                          title="Delete Sub Course"
                        >
                          {deletingId === subCourseId ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Chapter Level */}
                    {isSubCourseExpanded && (
                      <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                        {chapterItems.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
                            <ListTree
                              size={24}
                              className="mx-auto text-slate-400"
                            />
                            <p className="mt-2 text-sm font-medium text-slate-600">
                              No chapters added yet
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                openCreateModal("chapter", subCourseId)
                              }
                              className="
                                mt-3 inline-flex items-center gap-1.5
                                text-xs font-semibold text-slate-700
                                hover:text-black
                              "
                            >
                              <Plus size={15} />
                              Add Chapter
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chapterItems.map((chapter, chapterIndex) => {
                              const chapterId = chapter._id;
                              const topicItems = getTopicItems(chapterId);
                              const isChapterExpanded =
                                !!expandedChapters[chapterId];

                              return (
                                <div
                                  key={chapterId}
                                  className="
                                    overflow-hidden rounded-xl border
                                    border-slate-200 bg-white
                                  "
                                >
                                  {/* Chapter Header */}
                                  <div
                                    className="
                                      flex flex-col gap-3 px-3.5 py-3.5
                                      sm:flex-row sm:items-center
                                      sm:justify-between sm:px-4
                                    "
                                  >
                                    <div className="flex min-w-0 items-start gap-2.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleChapter(chapterId)
                                        }
                                        className="
                                          mt-0.5 flex h-7 w-7 shrink-0
                                          items-center justify-center
                                          rounded-md text-slate-400
                                          hover:bg-slate-100 hover:text-slate-700
                                        "
                                        aria-label={
                                          isChapterExpanded
                                            ? "Collapse chapter"
                                            : "Expand chapter"
                                        }
                                      >
                                        {isChapterExpanded ? (
                                          <ChevronDown size={17} />
                                        ) : (
                                          <ChevronRight size={17} />
                                        )}
                                      </button>

                                      <div
                                        className="
                                          flex h-9 w-9 shrink-0
                                          items-center justify-center
                                          rounded-lg bg-slate-100
                                          text-slate-500
                                        "
                                      >
                                        <ListTree size={17} />
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-[11px] font-semibold text-slate-400">
                                            Chapter {chapterIndex + 1}
                                          </span>
                                          <span className="text-[11px] text-slate-400">
                                            • {topicItems.length} topics
                                          </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-sm font-bold text-slate-800">
                                          {chapter.title}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openCreateModal("topic", chapterId)
                                        }
                                        className="
                                          inline-flex items-center gap-1.5
                                          rounded-lg px-2.5 py-1.5 text-xs
                                          font-semibold text-slate-600
                                          transition hover:bg-slate-100
                                        "
                                      >
                                        <Plus size={14} />
                                        Topic
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEditModal("chapter", chapter)
                                        }
                                        className="
                                          rounded-lg p-1.5 text-slate-400
                                          hover:bg-slate-100 hover:text-slate-800
                                        "
                                        title="Edit Chapter"
                                      >
                                        <Pencil size={15} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDelete("chapter", chapter)
                                        }
                                        disabled={deletingId === chapterId}
                                        className="
                                          rounded-lg p-1.5 text-slate-400
                                          hover:bg-slate-100 hover:text-red-600
                                          disabled:opacity-50
                                        "
                                        title="Delete Chapter"
                                      >
                                        {deletingId === chapterId ? (
                                          <Loader2
                                            size={15}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <Trash2 size={15} />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Topic Level */}
                                  {isChapterExpanded && (
                                    <div
                                      className="
                                        border-t border-slate-100 bg-slate-50/70
                                        p-3
                                      "
                                    >
                                      {topicItems.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                                          <FileText
                                            size={21}
                                            className="mx-auto text-slate-300"
                                          />
                                          <p className="mt-2 text-xs font-medium text-slate-500">
                                            No topics added yet
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openCreateModal(
                                                "topic",
                                                chapterId
                                              )
                                            }
                                            className="mt-2 text-xs font-semibold text-slate-700 hover:text-black"
                                          >
                                            + Add Topic
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {topicItems.map(
                                            (topic, topicIndex) => {
                                              const topicId = topic._id;
                                              const lessonItems =
                                                getLessonItems(topicId);
                                              const isTopicExpanded =
                                                !!expandedTopics[topicId];

                                              return (
                                                <div
                                                  key={topicId}
                                                  className="
                                                    overflow-hidden rounded-lg
                                                    border border-slate-200
                                                    bg-white
                                                  "
                                                >
                                                  {/* Topic Header */}
                                                  <div
                                                    className="
                                                      flex flex-col gap-2.5
                                                      px-3 py-3
                                                      sm:flex-row sm:items-center
                                                      sm:justify-between
                                                    "
                                                  >
                                                    <div className="flex min-w-0 items-start gap-2.5">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          toggleTopic(topicId)
                                                        }
                                                        className="
                                                          mt-0.5 flex h-6 w-6
                                                          shrink-0 items-center
                                                          justify-center
                                                          rounded-md text-slate-400
                                                          hover:bg-slate-100
                                                        "
                                                        aria-label={
                                                          isTopicExpanded
                                                            ? "Collapse topic"
                                                            : "Expand topic"
                                                        }
                                                      >
                                                        {isTopicExpanded ? (
                                                          <ChevronDown size={15} />
                                                        ) : (
                                                          <ChevronRight size={15} />
                                                        )}
                                                      </button>

                                                      <div className="flex min-w-0 items-start gap-2">
                                                        <FileText
                                                          size={16}
                                                          className="mt-0.5 shrink-0 text-slate-400"
                                                        />
                                                        <div className="min-w-0">
                                                          <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                              Topic {topicIndex + 1}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                              • {lessonItems.length}{" "}
                                                              {lessonItems.length === 1
                                                                ? "lesson"
                                                                : "lessons"}
                                                            </span>
                                                          </div>
                                                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                                                            {topic.title}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleAddLesson(topicId)}
                                                        className="
                                                          inline-flex items-center
                                                          gap-1.5 rounded-lg px-2.5
                                                          py-1.5 text-xs font-semibold
                                                          text-slate-600
                                                          hover:bg-slate-100
                                                        "
                                                      >
                                                        <Plus size={13} />
                                                        Lesson
                                                      </button>

                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          openEditModal(
                                                            "topic",
                                                            topic
                                                          )
                                                        }
                                                        className="
                                                          rounded-lg p-1.5
                                                          text-slate-400
                                                          hover:bg-slate-100
                                                          hover:text-slate-800
                                                        "
                                                        title="Edit Topic"
                                                      >
                                                        <Pencil size={14} />
                                                      </button>

                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleDelete(
                                                            "topic",
                                                            topic
                                                          )
                                                        }
                                                        disabled={
                                                          deletingId === topicId
                                                        }
                                                        className="
                                                          rounded-lg p-1.5
                                                          text-slate-400
                                                          hover:bg-slate-100
                                                          hover:text-red-600
                                                          disabled:opacity-50
                                                        "
                                                        title="Delete Topic"
                                                      >
                                                        {deletingId === topicId ? (
                                                          <Loader2
                                                            size={14}
                                                            className="animate-spin"
                                                          />
                                                        ) : (
                                                          <Trash2 size={14} />
                                                        )}
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Lesson Level */}
                                                  {isTopicExpanded && (
                                                    <div className="border-t border-slate-100 bg-slate-50 p-3">
                                                      {lessonItems.length === 0 ? (
                                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
                                                          <p className="text-xs font-medium text-slate-500">
                                                            No lessons added yet
                                                          </p>
                                                          <button
                                                            type="button"
                                                            onClick={() => handleAddLesson(topicId)}
                                                            className="mt-2 text-xs font-semibold text-slate-700 hover:text-black"
                                                          >
                                                            + Add Lesson
                                                          </button>
                                                        </div>
                                                      ) : (
                                                        <div className="space-y-1.5">
                                                          {lessonItems.map(
                                                            (
                                                              lesson,
                                                              lessonIndex
                                                            ) => (
                                                              <div
                                                                key={lesson._id}
                                                                className="
                                                                  flex flex-col
                                                                  gap-2 rounded-lg
                                                                  border border-slate-200
                                                                  bg-white px-3 py-2.5
                                                                  sm:flex-row
                                                                  sm:items-center
                                                                  sm:justify-between
                                                                "
                                                              >
                                                                <div className="flex min-w-0 items-center gap-2.5">
                                                                  <span
                                                                    className="
                                                                      flex h-7 w-7
                                                                      shrink-0 items-center
                                                                      justify-center
                                                                      rounded-md
                                                                      bg-slate-100
                                                                      text-[11px]
                                                                      font-bold
                                                                      text-slate-500
                                                                    "
                                                                  >
                                                                    {lessonIndex + 1}
                                                                  </span>

                                                                  <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium text-slate-800">
                                                                      {lesson.title}
                                                                    </p>
                                                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                                                      Position{" "}
                                                                      {lesson.position ||
                                                                        lessonIndex +
                                                                          1}
                                                                    </p>
                                                                  </div>
                                                                </div>

                                                                <div className="flex items-center justify-end gap-1">
                                                                  <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                      navigate(
                                                                        `/teacher/courses/${courseId}/lessons/${lesson._id}/edit`
                                                                      )
                                                                    }
                                                                    className="
                                                                      rounded-lg p-1.5
                                                                      text-slate-400
                                                                      hover:bg-slate-100
                                                                      hover:text-slate-800
                                                                    "
                                                                    title="Edit Lesson"
                                                                  >
                                                                    <Pencil size={14} />
                                                                  </button>

                                                                  <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                      handleDelete(
                                                                        "lesson",
                                                                        lesson
                                                                      )
                                                                    }
                                                                    disabled={
                                                                      deletingId ===
                                                                      lesson._id
                                                                    }
                                                                    className="
                                                                      rounded-lg p-1.5
                                                                      text-slate-400
                                                                      hover:bg-slate-100
                                                                      hover:text-red-600
                                                                      disabled:opacity-50
                                                                    "
                                                                    title="Delete Lesson"
                                                                  >
                                                                    {deletingId ===
                                                                    lesson._id ? (
                                                                      <Loader2
                                                                        size={14}
                                                                        className="animate-spin"
                                                                      />
                                                                    ) : (
                                                                      <Trash2
                                                                        size={14}
                                                                      />
                                                                    )}
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            )
                                                          )}
                                                        </div>
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
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Professional Curriculum Modal */}
      {modal && (
        <div
          className="
            fixed inset-0 z-50 flex items-center justify-center
            bg-slate-950/60 px-4 py-5 backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="
              flex max-h-[calc(100vh-40px)] w-full max-w-xl flex-col
              overflow-hidden rounded-2xl border border-slate-200
              bg-white shadow-2xl
            "
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="
                    flex h-10 w-10 shrink-0 items-center justify-center
                    rounded-xl bg-[var(--color-primary)]/15 text-slate-800
                  "
                >
                  {modal.type === "subCourse" && <Layers size={19} />}
                  {modal.type === "chapter" && <ListTree size={19} />}
                  {modal.type === "topic" && <FileText size={19} />}
                  {modal.type === "lesson" && <BookOpen size={19} />}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {getModalTitle()}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {modal.mode === "create" ? "Create" : "Edit"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {modalParentLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  flex h-8 w-8 shrink-0 items-center justify-center
                  rounded-lg text-slate-400 transition
                  hover:bg-slate-100 hover:text-slate-700
                  disabled:opacity-40
                "
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
            >
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label
                    htmlFor="curriculum-title"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    {modalLabel} Title
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="curriculum-title"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder={`Enter ${modalLabel.toLowerCase()} title`}
                    required
                    autoFocus
                    className="
                      h-11 w-full rounded-xl border border-slate-200
                      bg-white px-3.5 text-sm text-slate-900 outline-none
                      placeholder:text-slate-400 transition
                      focus:border-slate-400 focus:ring-4 focus:ring-slate-100
                    "
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="curriculum-description"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Description
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="curriculum-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={`Add a short description for this ${modalLabel.toLowerCase()}...`}
                    rows={4}
                    className="
                      w-full resize-none rounded-xl border border-slate-200
                      bg-white px-3.5 py-3 text-sm text-slate-900 outline-none
                      placeholder:text-slate-400 transition
                      focus:border-slate-400 focus:ring-4 focus:ring-slate-100
                    "
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Keep it short and clear so teachers and students can
                    understand the purpose of this section.
                  </p>
                </div>

                {/* Position */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="curriculum-position"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Position
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Optional • Auto if empty
                    </span>
                  </div>

                  <input
                    id="curriculum-position"
                    type="number"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    min="1"
                    inputMode="numeric"
                    placeholder="Auto generated"
                    className="
                      h-11 w-full rounded-xl border border-slate-200
                      bg-white px-3.5 text-sm text-slate-900 outline-none
                      placeholder:text-slate-400 transition
                      focus:border-slate-400 focus:ring-4 focus:ring-slate-100
                    "
                  />
                </div>
              </div>

              {/* Actions */}
              <div
                className="
                  mt-7 flex flex-col-reverse gap-2.5 border-t
                  border-slate-100 pt-5 sm:flex-row sm:justify-end
                "
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    h-11 rounded-xl border border-slate-200 bg-white
                    px-5 text-sm font-semibold text-slate-600 transition
                    hover:bg-slate-50 disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !formData.title.trim()}
                  className="
                    inline-flex h-11 items-center justify-center gap-2
                    rounded-xl bg-[var(--color-primary)] px-5 text-sm
                    font-bold text-black shadow-sm transition hover:opacity-90
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : modal.mode === "create"
                      ? `Create ${modalLabel}`
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseCurriculum;