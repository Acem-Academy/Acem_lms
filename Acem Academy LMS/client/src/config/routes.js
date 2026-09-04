export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",

  // Admin
  ADMIN: {
    ROOT: "/admin",
    DASHBOARD: "/admin/dashboard",
    USERS: "/admin/users",
    COURSES: "/admin/courses",
  },

  // Teacher
 TEACHER: {
    ROOT: "/teacher",
    DASHBOARD: "/teacher/dashboard",
    COURSES: "/teacher/courses",
    COURSE_DETAILS: "/teacher/courses/:courseId",
    STUDENTS: "/teacher/students",
},

  // Student
STUDENT: {
    DASHBOARD: "/student/dashboard",
    COURSES: "/student/courses",
    MY_LEARNING: "/student/my-learning",
    COURSE_DETAILS: "/student/courses/:courseId",
    LEARNING: "/student/learning/:enrollmentId",
    PROFILE: "/student/profile",
},

  NOT_FOUND: "*",
};