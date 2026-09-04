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
  createLesson,
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

        if (type === "lesson") {
          await createLesson({
            title: formData.title.trim(),
            description: formData.description.trim(),
            topic: modal.parentId,
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

  return (
    <div className="p-6">

      {/* Header */}

      <div className="mb-8 flex items-center justify-between">

        <div className="flex items-center gap-4">

          <button
            onClick={() =>
              navigate(
                `/teacher/courses/${courseId}`
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
            <ArrowLeft size={20} />
          </button>

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              Course Curriculum
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Build and manage your course structure
            </p>

          </div>

        </div>

      </div>


      {/* Error */}

      {error && (
        <div className="
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
        ">

          <span>
            {error}
          </span>

          <button
            onClick={() => setError("")}
            className="font-semibold"
          >
            ×
          </button>

        </div>
      )}


      {/* Course Information */}

      <div className="
        mb-6
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
      ">

        <div className="flex items-center justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-slate-100
                text-slate-600
              ">
                <BookOpen size={21} />
              </div>

              <div>

                <h2 className="text-lg font-semibold text-slate-900">
                  Course Curriculum
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Course ID: {courseId}
                </p>

              </div>

            </div>

          </div>

          <div className="
            rounded-xl
            bg-slate-50
            px-4
            py-2
            text-sm
            text-slate-600
          ">
            {courseSubCourses.length} Sub Course
            {courseSubCourses.length !== 1
              ? "s"
              : ""}
          </div>

        </div>

      </div>


      {/* Curriculum */}

      <div className="
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
      ">

        {/* Curriculum Header */}

        <div className="
          flex
          items-center
          justify-between
          border-b
          border-slate-200
          p-5
        ">

          <div>

            <h2 className="text-lg font-semibold text-slate-900">
              Curriculum Structure
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage sub courses, chapters, topics and lessons
            </p>

          </div>

          <button
            onClick={() =>
              openCreateModal("subCourse")
            }
            className="
              flex
              items-center
              gap-2
              rounded-xl
              bg-[var(--color-primary)]
              px-4
              py-2.5
              text-sm
              font-semibold
              text-black
              shadow-sm
              transition
              hover:opacity-90
            "
          >
            <Plus size={18} />
            Add Sub Course
          </button>

        </div>


        {/* Empty */}

        {courseSubCourses.length === 0 ? (

          <div className="p-12 text-center">

            <div className="
              mx-auto
              mb-4
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-slate-100
              text-slate-500
            ">
              <Layers size={28} />
            </div>

            <h3 className="text-lg font-semibold text-slate-800">
              No Sub Courses Yet
            </h3>

            <p className="
              mx-auto
              mt-2
              max-w-md
              text-sm
              leading-6
              text-slate-500
            ">
              Start building your curriculum by adding
              your first sub course.
            </p>

            <button
              onClick={() =>
                openCreateModal("subCourse")
              }
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[var(--color-primary)]
                px-5
                py-2.5
                text-sm
                font-semibold
                text-black
                transition
                hover:opacity-90
              "
            >
              <Plus size={18} />
              Add Sub Course
            </button>

          </div>

        ) : (

          <div className="p-5">

            {courseSubCourses.map(
              (subCourse, subCourseIndex) => {

                const subCourseId =
                  subCourse._id;

                const chapterItems =
                  getChapterItems(
                    subCourseId
                  );

                const isSubCourseExpanded =
                  !!expandedSubCourses[
                    subCourseId
                  ];

                return (
                  <div
                    key={subCourseId}
                    className="
                      mb-4
                      overflow-hidden
                      rounded-2xl
                      border
                      border-slate-200
                      last:mb-0
                    "
                  >

                    {/* Sub Course */}

                    <div className="
                      flex
                      items-center
                      justify-between
                      bg-slate-50
                      px-5
                      py-4
                    ">

                      <div className="flex items-center gap-3">

                        <button
                          onClick={() =>
                            toggleSubCourse(
                              subCourseId
                            )
                          }
                          className="
                            rounded-lg
                            p-1.5
                            text-slate-500
                            hover:bg-white
                          "
                        >
                          {isSubCourseExpanded ? (
                            <ChevronDown size={19} />
                          ) : (
                            <ChevronRight size={19} />
                          )}
                        </button>

                        <div className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          bg-white
                          text-slate-600
                          shadow-sm
                        ">
                          <Layers size={19} />
                        </div>

                        <div>

                          <div className="flex items-center gap-2">

                            <span className="
                              text-xs
                              font-semibold
                              text-slate-400
                            ">
                              {String(
                                subCourseIndex + 1
                              ).padStart(2, "0")}
                            </span>

                            <h3 className="
                              font-semibold
                              text-slate-900
                            ">
                              {subCourse.title}
                            </h3>

                          </div>

                          <p className="
                            mt-0.5
                            text-xs
                            text-slate-500
                          ">
                            {chapterItems.length} Chapter
                            {chapterItems.length !== 1
                              ? "s"
                              : ""}
                          </p>

                        </div>

                      </div>


                      <div className="flex items-center gap-2">

                        <button
                          onClick={() =>
                            openCreateModal(
                              "chapter",
                              subCourseId
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-slate-700
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                          "
                        >
                          <Plus size={15} />
                          Chapter
                        </button>

                        <button
                          onClick={() =>
                            openEditModal(
                              "subCourse",
                              subCourse
                            )
                          }
                          className="
                            rounded-lg
                            p-2
                            text-slate-500
                            transition
                            hover:bg-white
                            hover:text-slate-900
                          "
                          title="Edit Sub Course"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              "subCourse",
                              subCourse
                            )
                          }
                          disabled={
                            deletingId ===
                            subCourseId
                          }
                          className="
                            rounded-lg
                            p-2
                            text-slate-400
                            transition
                            hover:bg-white
                            hover:text-red-600
                            disabled:opacity-50
                          "
                          title="Delete Sub Course"
                        >
                          {deletingId ===
                          subCourseId ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>

                      </div>

                    </div>


                    {/* Chapters */}

                    {isSubCourseExpanded && (

                      <div className="border-t border-slate-200 p-4">

                        {chapterItems.length === 0 ? (

                          <div className="
                            rounded-xl
                            border
                            border-dashed
                            border-slate-200
                            p-6
                            text-center
                          ">

                            <p className="
                              text-sm
                              text-slate-500
                            ">
                              No chapters added yet.
                            </p>

                            <button
                              onClick={() =>
                                openCreateModal(
                                  "chapter",
                                  subCourseId
                                )
                              }
                              className="
                                mt-3
                                inline-flex
                                items-center
                                gap-1.5
                                text-sm
                                font-semibold
                                text-slate-700
                                hover:text-black
                              "
                            >
                              <Plus size={16} />
                              Add Chapter
                            </button>

                          </div>

                        ) : (

                          <div className="space-y-3">

                            {chapterItems.map(
                              (
                                chapter,
                                chapterIndex
                              ) => {

                                const chapterId =
                                  chapter._id;

                                const topicItems =
                                  getTopicItems(
                                    chapterId
                                  );

                                const isChapterExpanded =
                                  !!expandedChapters[
                                    chapterId
                                  ];

                                return (
                                  <div
                                    key={chapterId}
                                    className="
                                      overflow-hidden
                                      rounded-xl
                                      border
                                      border-slate-200
                                    "
                                  >

                                    {/* Chapter */}

                                    <div className="
                                      flex
                                      items-center
                                      justify-between
                                      px-4
                                      py-3.5
                                    ">

                                      <div className="
                                        flex
                                        items-center
                                        gap-3
                                      ">

                                        <button
                                          onClick={() =>
                                            toggleChapter(
                                              chapterId
                                            )
                                          }
                                          className="
                                            rounded-md
                                            p-1
                                            text-slate-400
                                            hover:bg-slate-100
                                          "
                                        >
                                          {isChapterExpanded ? (
                                            <ChevronDown
                                              size={17}
                                            />
                                          ) : (
                                            <ChevronRight
                                              size={17}
                                            />
                                          )}
                                        </button>

                                        <div className="
                                          flex
                                          h-8
                                          w-8
                                          items-center
                                          justify-center
                                          rounded-lg
                                          bg-slate-100
                                          text-slate-500
                                        ">
                                          <ListTree
                                            size={16}
                                          />
                                        </div>

                                        <div>

                                          <div className="
                                            flex
                                            items-center
                                            gap-2
                                          ">

                                            <span className="
                                              text-xs
                                              font-medium
                                              text-slate-400
                                            ">
                                              {chapterIndex + 1}.
                                            </span>

                                            <span className="
                                              text-sm
                                              font-semibold
                                              text-slate-800
                                            ">
                                              {chapter.title}
                                            </span>

                                          </div>

                                          <p className="
                                            mt-0.5
                                            text-xs
                                            text-slate-400
                                          ">
                                            {topicItems.length} Topic
                                            {topicItems.length !== 1
                                              ? "s"
                                              : ""}
                                          </p>

                                        </div>

                                      </div>


                                      <div className="
                                        flex
                                        items-center
                                        gap-1
                                      ">

                                        <button
                                          onClick={() =>
                                            openCreateModal(
                                              "topic",
                                              chapterId
                                            )
                                          }
                                          className="
                                            mr-1
                                            flex
                                            items-center
                                            gap-1
                                            rounded-lg
                                            px-2.5
                                            py-1.5
                                            text-xs
                                            font-semibold
                                            text-slate-600
                                            hover:bg-slate-100
                                          "
                                        >
                                          <Plus size={14} />
                                          Topic
                                        </button>

                                        <button
                                          onClick={() =>
                                            openEditModal(
                                              "chapter",
                                              chapter
                                            )
                                          }
                                          className="
                                            rounded-lg
                                            p-2
                                            text-slate-400
                                            hover:bg-slate-100
                                            hover:text-slate-800
                                          "
                                        >
                                          <Pencil size={15} />
                                        </button>

                                        <button
                                          onClick={() =>
                                            handleDelete(
                                              "chapter",
                                              chapter
                                            )
                                          }
                                          disabled={
                                            deletingId ===
                                            chapterId
                                          }
                                          className="
                                            rounded-lg
                                            p-2
                                            text-slate-400
                                            hover:bg-slate-100
                                            hover:text-red-600
                                            disabled:opacity-50
                                          "
                                        >
                                          {deletingId ===
                                          chapterId ? (
                                            <Loader2
                                              size={15}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Trash2
                                              size={15}
                                            />
                                          )}
                                        </button>

                                      </div>

                                    </div>


                                    {/* Topics */}

                                    {isChapterExpanded && (

                                      <div className="
                                        border-t
                                        border-slate-100
                                        bg-slate-50/50
                                        p-3
                                      ">

                                        {topicItems.length === 0 ? (

                                          <div className="
                                            rounded-lg
                                            border
                                            border-dashed
                                            border-slate-200
                                            bg-white
                                            p-4
                                            text-center
                                          ">

                                            <p className="
                                              text-xs
                                              text-slate-500
                                            ">
                                              No topics added yet.
                                            </p>

                                            <button
                                              onClick={() =>
                                                openCreateModal(
                                                  "topic",
                                                  chapterId
                                                )
                                              }
                                              className="
                                                mt-2
                                                text-xs
                                                font-semibold
                                                text-slate-700
                                              "
                                            >
                                              + Add Topic
                                            </button>

                                          </div>

                                        ) : (

                                          <div className="space-y-2">

                                            {topicItems.map(
                                              (
                                                topic,
                                                topicIndex
                                              ) => {

                                                const topicId =
                                                  topic._id;

                                                const lessonItems =
                                                  getLessonItems(
                                                    topicId
                                                  );

                                                const isTopicExpanded =
                                                  !!expandedTopics[
                                                    topicId
                                                  ];

                                                return (
                                                  <div
                                                    key={topicId}
                                                    className="
                                                      overflow-hidden
                                                      rounded-lg
                                                      border
                                                      border-slate-200
                                                      bg-white
                                                    "
                                                  >

                                                    {/* Topic */}

                                                    <div className="
                                                      flex
                                                      items-center
                                                      justify-between
                                                      px-3
                                                      py-3
                                                    ">

                                                      <div className="
                                                        flex
                                                        items-center
                                                        gap-2.5
                                                      ">

                                                        <button
                                                          onClick={() =>
                                                            toggleTopic(
                                                              topicId
                                                            )
                                                          }
                                                          className="
                                                            rounded-md
                                                            p-1
                                                            text-slate-400
                                                            hover:bg-slate-100
                                                          "
                                                        >
                                                          {isTopicExpanded ? (
                                                            <ChevronDown
                                                              size={16}
                                                            />
                                                          ) : (
                                                            <ChevronRight
                                                              size={16}
                                                            />
                                                          )}
                                                        </button>

                                                        <FileText
                                                          size={16}
                                                          className="text-slate-400"
                                                        />

                                                        <div>

                                                          <div className="
                                                            flex
                                                            items-center
                                                            gap-2
                                                          ">

                                                            <span className="
                                                              text-xs
                                                              text-slate-400
                                                            ">
                                                              {topicIndex + 1}.
                                                            </span>

                                                            <span className="
                                                              text-sm
                                                              font-medium
                                                              text-slate-800
                                                            ">
                                                              {topic.title}
                                                            </span>

                                                          </div>

                                                          <p className="
                                                            mt-0.5
                                                            text-[11px]
                                                            text-slate-400
                                                          ">
                                                            {lessonItems.length} Lesson
                                                            {lessonItems.length !== 1
                                                              ? "s"
                                                              : ""}
                                                          </p>

                                                        </div>

                                                      </div>


                                                      <div className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                      ">

                                                        <button
                                                          onClick={() =>
                                                            openCreateModal(
                                                              "lesson",
                                                              topicId
                                                            )
                                                          }
                                                          className="
                                                            mr-1
                                                            flex
                                                            items-center
                                                            gap-1
                                                            rounded-lg
                                                            px-2
                                                            py-1.5
                                                            text-xs
                                                            font-semibold
                                                            text-slate-600
                                                            hover:bg-slate-100
                                                          "
                                                        >
                                                          <Plus size={13} />
                                                          Lesson
                                                        </button>

                                                        <button
                                                          onClick={() =>
                                                            openEditModal(
                                                              "topic",
                                                              topic
                                                            )
                                                          }
                                                          className="
                                                            rounded-lg
                                                            p-1.5
                                                            text-slate-400
                                                            hover:bg-slate-100
                                                            hover:text-slate-800
                                                          "
                                                        >
                                                          <Pencil size={14} />
                                                        </button>

                                                        <button
                                                          onClick={() =>
                                                            handleDelete(
                                                              "topic",
                                                              topic
                                                            )
                                                          }
                                                          disabled={
                                                            deletingId ===
                                                            topicId
                                                          }
                                                          className="
                                                            rounded-lg
                                                            p-1.5
                                                            text-slate-400
                                                            hover:bg-slate-100
                                                            hover:text-red-600
                                                            disabled:opacity-50
                                                          "
                                                        >
                                                          {deletingId ===
                                                          topicId ? (
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


                                                    {/* Lessons */}

                                                    {isTopicExpanded && (

                                                      <div className="
                                                        border-t
                                                        border-slate-100
                                                        bg-slate-50
                                                        p-3
                                                      ">

                                                        {lessonItems.length === 0 ? (

                                                          <div className="
                                                            rounded-lg
                                                            border
                                                            border-dashed
                                                            border-slate-200
                                                            bg-white
                                                            p-4
                                                            text-center
                                                          ">

                                                            <p className="
                                                              text-xs
                                                              text-slate-500
                                                            ">
                                                              No lessons added yet.
                                                            </p>

                                                            <button
                                                              onClick={() =>
                                                                openCreateModal(
                                                                  "lesson",
                                                                  topicId
                                                                )
                                                              }
                                                              className="
                                                                mt-2
                                                                text-xs
                                                                font-semibold
                                                                text-slate-700
                                                              "
                                                            >
                                                              + Add Lesson
                                                            </button>

                                                          </div>

                                                        ) : (

                                                          <div className="space-y-2">

                                                            {lessonItems.map(
                                                              (
                                                                lesson,
                                                                lessonIndex
                                                              ) => (

                                                                <div
                                                                  key={
                                                                    lesson._id
                                                                  }
                                                                  className="
                                                                    flex
                                                                    items-center
                                                                    justify-between
                                                                    rounded-lg
                                                                    border
                                                                    border-slate-200
                                                                    bg-white
                                                                    px-3
                                                                    py-2.5
                                                                  "
                                                                >

                                                                  <div className="
                                                                    flex
                                                                    items-center
                                                                    gap-2.5
                                                                  ">

                                                                    <span className="
                                                                      flex
                                                                      h-6
                                                                      w-6
                                                                      items-center
                                                                      justify-center
                                                                      rounded-md
                                                                      bg-slate-100
                                                                      text-[11px]
                                                                      font-semibold
                                                                      text-slate-500
                                                                    ">
                                                                      {lessonIndex + 1}
                                                                    </span>

                                                                    <div>

                                                                      <p className="
                                                                        text-sm
                                                                        font-medium
                                                                        text-slate-800
                                                                      ">
                                                                        {lesson.title}
                                                                      </p>

                                                                      <p className="
                                                                        text-[11px]
                                                                        text-slate-400
                                                                      ">
                                                                        Lesson
                                                                      </p>

                                                                    </div>

                                                                  </div>


                                                                  <div className="
                                                                    flex
                                                                    items-center
                                                                    gap-1
                                                                  ">

                                                                    <button
                                                                      onClick={() =>
                                                                        openEditModal(
                                                                          "lesson",
                                                                          lesson
                                                                        )
                                                                      }
                                                                      className="
                                                                        rounded-lg
                                                                        p-1.5
                                                                        text-slate-400
                                                                        hover:bg-slate-100
                                                                        hover:text-slate-800
                                                                      "
                                                                    >
                                                                      <Pencil
                                                                        size={14}
                                                                      />
                                                                    </button>

                                                                    <button
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
                                                                        rounded-lg
                                                                        p-1.5
                                                                        text-slate-400
                                                                        hover:bg-slate-100
                                                                        hover:text-red-600
                                                                        disabled:opacity-50
                                                                      "
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
                              }
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


      {/* Modal */}

      {modal && (

        <div className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          bg-black/40
          px-4
        ">

          <div className="
            w-full
            max-w-lg
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-2xl
          ">

            {/* Modal Header */}

            <div className="
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              px-6
              py-4
            ">

              <div>

                <h2 className="
                  text-lg
                  font-semibold
                  text-slate-900
                ">
                  {getModalTitle()}
                </h2>

                <p className="
                  mt-1
                  text-xs
                  text-slate-500
                ">
                  Add or update curriculum information.
                </p>

              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="
                  rounded-lg
                  p-2
                  text-slate-400
                  hover:bg-slate-100
                  hover:text-slate-700
                "
              >
                <X size={18} />
              </button>

            </div>


            {/* Form */}

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >

              <div className="space-y-5">

                {/* Title */}

                <div>

                  <label className="
                    mb-2
                    block
                    text-sm
                    font-medium
                    text-slate-700
                  ">
                    Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter title"
                    required
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      focus:border-slate-400
                      focus:ring-2
                      focus:ring-slate-100
                    "
                  />

                </div>


                {/* Description */}

                <div>

                  <label className="
                    mb-2
                    block
                    text-sm
                    font-medium
                    text-slate-700
                  ">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter description"
                    rows={4}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      focus:border-slate-400
                      focus:ring-2
                      focus:ring-slate-100
                    "
                  />

                </div>


                {/* Position */}

                <div>

                  <label className="
                    mb-2
                    block
                    text-sm
                    font-medium
                    text-slate-700
                  ">
                    Position
                    <span className="
                      ml-1
                      text-xs
                      font-normal
                      text-slate-400
                    ">
                      Optional
                    </span>
                  </label>

                  <input
                    type="number"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Auto generated"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      focus:border-slate-400
                      focus:ring-2
                      focus:ring-slate-100
                    "
                  />

                </div>

              </div>


              {/* Actions */}

              <div className="
                mt-7
                flex
                justify-end
                gap-3
              ">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-slate-600
                    transition
                    hover:bg-slate-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !formData.title.trim()
                  }
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-[var(--color-primary)]
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-black
                    transition
                    hover:opacity-90
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {modal.mode === "create"
                    ? "Create"
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