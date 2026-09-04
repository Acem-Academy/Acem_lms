import axiosInstance from "./axios";
import { getMyCourses } from "@/api/course.api";
/*
|--------------------------------------------------------------------------
| Sub Courses
|--------------------------------------------------------------------------
*/

export const getSubCourses = async () => {
    const response = await axiosInstance.get(
        "/sub-courses"
    );

    return response.data;
};

export const createSubCourse = async (data) => {
    const response = await axiosInstance.post(
        "/sub-courses",
        data
    );

    return response.data;
};

export const updateSubCourse = async (
    subCourseId,
    data
) => {
    const response = await axiosInstance.patch(
        `/sub-courses/${subCourseId}`,
        data
    );

    return response.data;
};

export const deleteSubCourse = async (
    subCourseId
) => {
    const response = await axiosInstance.delete(
        `/sub-courses/${subCourseId}`
    );

    return response.data;
};

export const updateSubCourseStatus = async (
    subCourseId,
    status
) => {
    const response = await axiosInstance.patch(
        `/sub-courses/${subCourseId}/publish`,
        {
            status,
        }
    );

    return response.data;
};


/*
|--------------------------------------------------------------------------
| Chapters
|--------------------------------------------------------------------------
*/

export const getChapters = async () => {
    const response = await axiosInstance.get(
        "/chapters"
    );

    return response.data;
};

export const createChapter = async (data) => {
    const response = await axiosInstance.post(
        "/chapters",
        data
    );

    return response.data;
};

export const updateChapter = async (
    chapterId,
    data
) => {
    const response = await axiosInstance.patch(
        `/chapters/${chapterId}`,
        data
    );

    return response.data;
};

export const deleteChapter = async (
    chapterId
) => {
    const response = await axiosInstance.delete(
        `/chapters/${chapterId}`
    );

    return response.data;
};

export const updateChapterStatus = async (
    chapterId,
    status
) => {
    const response = await axiosInstance.patch(
        `/chapters/${chapterId}/publish`,
        {
            status,
        }
    );

    return response.data;
};


/*
|--------------------------------------------------------------------------
| Topics
|--------------------------------------------------------------------------
*/

export const getTopics = async () => {
    const response = await axiosInstance.get(
        "/topics"
    );

    return response.data;
};

export const createTopic = async (data) => {
    const response = await axiosInstance.post(
        "/topics",
        data
    );

    return response.data;
};

export const updateTopic = async (
    topicId,
    data
) => {
    const response = await axiosInstance.patch(
        `/topics/${topicId}`,
        data
    );

    return response.data;
};

export const deleteTopic = async (
    topicId
) => {
    const response = await axiosInstance.delete(
        `/topics/${topicId}`
    );

    return response.data;
};

export const updateTopicStatus = async (
    topicId,
    status
) => {
    const response = await axiosInstance.patch(
        `/topics/${topicId}/publish`,
        {
            status,
        }
    );

    return response.data;
};


/*
|--------------------------------------------------------------------------
| Lessons
|--------------------------------------------------------------------------
*/

export const getLessons = async () => {
    const response = await axiosInstance.get(
        "/lessons"
    );

    return response.data;
};

export const createLesson = async (data) => {
    const response = await axiosInstance.post(
        "/lessons",
        data
    );

    return response.data;
};

export const updateLesson = async (
    lessonId,
    data
) => {
    const response = await axiosInstance.patch(
        `/lessons/${lessonId}`,
        data
    );

    return response.data;
};

export const deleteLesson = async (
    lessonId
) => {
    const response = await axiosInstance.delete(
        `/lessons/${lessonId}`
    );

    return response.data;
};

export const updateLessonStatus = async (
    lessonId,
    status
) => {
    const response = await axiosInstance.patch(
        `/lessons/${lessonId}/publish`,
        {
            status,
        }
    );

    return response.data;
};