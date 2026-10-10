import { LayoutDashboard, BookOpen, Users, User } from "lucide-react";
import { ROUTES } from "./routes";
import { ROLES } from "./roles";

export const NAVIGATION = {
  [ROLES.ADMIN]: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: ROUTES.ADMIN.DASHBOARD,
    },
    {
      title: "Users",
      icon: Users,
      path: ROUTES.ADMIN.USERS,
    },
    {
      title: "Courses",
      icon: BookOpen,
      path: ROUTES.ADMIN.COURSES,
    },
  ],

  [ROLES.TEACHER]: [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: ROUTES.TEACHER.DASHBOARD,
  },
  {
    title: "Courses",
    icon: BookOpen,
    path: ROUTES.TEACHER.COURSES,
  },
  {
    title: "Students",
    icon: Users,
    path: ROUTES.TEACHER.STUDENTS,
  },
],

  [ROLES.STUDENT]: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: ROUTES.STUDENT.DASHBOARD,
    },
    {
      title: "My Courses",
      icon: BookOpen,
      path: ROUTES.STUDENT.MY_LEARNING,
    },
    {
      title: "Profile",
      icon: User,
      path: ROUTES.STUDENT.PROFILE,
    },
  ],
};