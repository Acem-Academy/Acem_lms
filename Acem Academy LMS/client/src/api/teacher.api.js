import axiosInstance from "./axios";

export const getMyCourses = async () => {
    const response = await axiosInstance.get(
        "/courses/my-courses"
    );

    return response.data;
};

export const updateCourse = async (courseId, courseData) => {
    const response = await axiosInstance.patch(
        `/courses/${courseId}`,
        courseData
    );

    return response.data;
};

export const updateCourseStatus = async (courseId, status) => {
    const response = await axiosInstance.patch(
        `/courses/${courseId}/publish`,
        {
            status,
        }
    );

    return response.data;
};

export const getSubCourses = async (courseId) => {
    const response = await axiosInstance.get(
        `/sub-courses?course=${courseId}`
    );

    return response.data;
};