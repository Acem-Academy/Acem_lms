import axiosInstance from "./axios";

export const getDashboardStatsApi = async () => {
    const response = await axiosInstance.get("/admin/dashboard");
    return response.data;
};

export const getAdminUsersApi = async (params = {}) => {
    const response = await axiosInstance.get("/admin/users", { params });
    return response.data;
};

export const updateAdminUserApi = async (userId, data) => {
    const response = await axiosInstance.patch(`/admin/users/${userId}`, data);
    return response.data;
};

export const getAdminCoursesApi = async (params = {}) => {
    const response = await axiosInstance.get("/admin/courses", { params });
    return response.data;
};

export const updateCourseStatusApi = async (courseId, status) => {
    const response = await axiosInstance.patch(`/courses/${courseId}/publish`, {
        status,
    });
    return response.data;
};

export const deleteCourseApi = async (courseId) => {
    const response = await axiosInstance.delete(`/courses/${courseId}`);
    return response.data;
};
