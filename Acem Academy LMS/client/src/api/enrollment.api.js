import axiosInstance from "./axios";

/*
|--------------------------------------------------------------------------
| Enroll In Course
|--------------------------------------------------------------------------
*/

export const enrollInCourse = async (courseId) => {
    const response = await axiosInstance.post(
        "/enrollments",
        {
            course: courseId,
        }
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get My Courses
|--------------------------------------------------------------------------
*/

export const getMyCourses = async () => {
    const response = await axiosInstance.get(
        "/enrollments/my-courses"
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get Enrollment By ID
|--------------------------------------------------------------------------
*/

export const getEnrollmentById = async (
    enrollmentId
) => {
    const response = await axiosInstance.get(
        `/enrollments/${enrollmentId}`
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get Teacher Students
|--------------------------------------------------------------------------
|
| Returns students enrolled in courses created by the
| currently authenticated teacher.
|
| Only ACTIVE and COMPLETED enrollments are returned
| by the backend.
|
*/

export const getTeacherStudents = async () => {
    const response = await axiosInstance.get(
        "/enrollments/teacher/students"
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Start Lesson
|--------------------------------------------------------------------------
*/

export const startLesson = async (
    enrollmentId,
    lessonId
) => {
    const response = await axiosInstance.post(
        `/enrollments/${enrollmentId}/lessons/${lessonId}/start`
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Complete Lesson
|--------------------------------------------------------------------------
*/

export const completeLesson = async (
    enrollmentId,
    lessonId
) => {
    const response = await axiosInstance.post(
        `/enrollments/${enrollmentId}/lessons/${lessonId}/complete`
    );

    return response.data;
};