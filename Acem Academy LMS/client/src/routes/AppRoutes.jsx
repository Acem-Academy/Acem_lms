import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

import AdminDashboard from "@/pages/admin/Dashboard";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import TeacherCourses from "@/pages/teacher/Courses";
import CourseManagement from "@/pages/teacher/CourseManagement";
import EditCourse from "@/pages/teacher/EditCourse";
import CourseCurriculum from "@/pages/teacher/CourseCurriculum";
import LessonEditor from "@/pages/teacher/LessonEditor";
import GetStudents from "@/pages/teacher/GetStudents";

import StudentLayout from "@/layouts/StudentLayout";
import TeacherLayout from "@/layouts/TeacherLayout";

import StudentDashboard from "@/pages/student/Dashboard";
import StudentCourses from "@/pages/student/Courses";
import MyLearning from "@/pages/student/MyLearning";
import CourseDetails from "@/pages/student/CourseDetails";
import Learning from "@/pages/student/Learning";
import StudentProfile from "@/pages/student/Profile";
import MaterialViewer from "@/pages/student/MaterialViewer";

import NotFound from "@/pages/common/NotFound";
import Unauthorized from "@/pages/common/Unauthorized";

import ProtectedRoute from "@/routes/ProtectedRoute";
import PublicRoute from "@/routes/PublicRoute";

import { ROUTES } from "@/config/routes";
import { ROLES } from "@/config/roles";


function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>


        {/* ====================================================== */}
        {/* Root Redirect */}
        {/* ====================================================== */}

        <Route
          path={ROUTES.HOME}
          element={
            <Navigate
              to={ROUTES.LOGIN}
              replace
            />
          }
        />


        {/* ====================================================== */}
        {/* Public */}
        {/* ====================================================== */}

        <Route
          path={ROUTES.LOGIN}
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path={ROUTES.REGISTER}
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />


        {/* ====================================================== */}
        {/* Admin */}
        {/* ====================================================== */}

        <Route
          path={ROUTES.ADMIN.DASHBOARD}
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />


       {/* ====================================================== */}
{/* Teacher */}
{/* ====================================================== */}

<Route
    path={ROUTES.TEACHER.ROOT}
    element={
        <ProtectedRoute roles={[ROLES.TEACHER]}>
            <TeacherLayout />
        </ProtectedRoute>
    }
>
    {/* /teacher → /teacher/dashboard */}

    <Route
        index
        element={
            <Navigate
                to="dashboard"
                replace
            />
        }
    />

    {/* Teacher Dashboard */}

    <Route
        path="dashboard"
        element={
            <TeacherDashboard />
        }
    />

    {/* Teacher Courses */}

    <Route
        path="courses"
        element={
            <TeacherCourses />
        }
    />

    <Route
        path="courses/:courseId"
        element={<CourseManagement />}
    />

    <Route
    path="courses/:courseId/edit"
    element={<EditCourse />}
/>

<Route
  path="courses/:courseId/curriculum"
  element={<CourseCurriculum />}
/>

<Route
    path="courses/create"
    element={<EditCourse />}
/>


<Route
    path="courses/:courseId/lessons/:lessonId/edit"
    element={<LessonEditor />}
/>

 <Route
        path="/teacher/students"
        element={<GetStudents />}
    />

</Route>

        {/* ====================================================== */}
        {/* Student */}
        {/* ====================================================== */}

        <Route
          path="/student"
          element={
            <ProtectedRoute roles={[ROLES.STUDENT]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >

          <Route
            index
            element={
              <Navigate
                to={ROUTES.STUDENT.DASHBOARD}
                replace
              />
            }
          />

          <Route
            path="dashboard"
            element={
              <StudentDashboard />
            }
          />

          <Route
            path="courses"
            element={
              <StudentCourses />
            }
          />

          <Route
            path="courses/:courseId"
            element={
              <CourseDetails />
            }
          />

          <Route
            path="my-learning"
            element={
              <MyLearning />
            }
          />

          <Route
            path="learning/:enrollmentId"
            element={
              <Learning />
            }
          />

           {/* Course Material Viewer */}
  <Route
    path="material/:lessonId"
    element={
      <MaterialViewer />
    }
  />

          <Route
            path="profile"
            element={
              <StudentProfile />
            }
          />

          

        </Route>


        {/* ====================================================== */}
        {/* 403 Unauthorized */}
        {/* ====================================================== */}

        <Route
          path={ROUTES.UNAUTHORIZED}
          element={
            <Unauthorized />
          }
        />


        {/* ====================================================== */}
        {/* 404 */}
        {/* ====================================================== */}

        <Route
          path="*"
          element={
            <NotFound />
          }
        />

      </Routes>

    </BrowserRouter>

  );
}


export default AppRoutes;