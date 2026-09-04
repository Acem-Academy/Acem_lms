import { Outlet } from "react-router-dom";

import Sidebar from "@/components/layout/Sidebar";
import { ROLES } from "@/config/roles";

function TeacherLayout() {
  return (
    <div className="min-h-screen bg-black text-white">

      <Sidebar role={ROLES.TEACHER} />

      <main className="min-h-screen pl-64">
        <Outlet />
      </main>

    </div>
  );
}

export default TeacherLayout;