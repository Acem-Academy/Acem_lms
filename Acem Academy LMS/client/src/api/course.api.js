import axiosInstance from "./axios";

/*
|--------------------------------------------------------------------------
| Get All Courses
|--------------------------------------------------------------------------
*/

export const getCourses = async () => {
    const response = await axiosInstance.get("/courses");

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get Course By ID
|--------------------------------------------------------------------------
*/

export const getCourseById = async (courseId) => {
    const response = await axiosInstance.get(
        `/courses/${courseId}`
    );

    return response.data;
};



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