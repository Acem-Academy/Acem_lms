import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Search,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  getAdminCoursesApi,
  updateCourseStatusApi,
  deleteCourseApi,
} from "@/api/admin.api";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import ErrorAlert from "@/components/common/ErrorAlert";
import EmptyState from "@/components/common/EmptyState";
import ConfirmModal from "@/components/common/ConfirmModal";
import { showToastSuccess, showToastError } from "@/utils/errorHandler";

const AdminCourses = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    variant: "danger",
    onConfirm: () => {},
  });

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    setDebouncedSearch(val);
  };

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: [
      "admin-courses",
      page,
      statusFilter,
      visibilityFilter,
      debouncedSearch,
    ],
    queryFn: async () => {
      const params = {
        page,
        limit: 15,
      };
      if (statusFilter) params.status = statusFilter;
      if (visibilityFilter) params.visibility = visibilityFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await getAdminCoursesApi(params);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ courseId, status }) => {
      const res = await updateCourseStatusApi(courseId, status);
      return res.data;
    },
    onSuccess: (_, variables) => {
      showToastSuccess(`Course marked as ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err) => {
      showToastError(err, "Failed to update course status");
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId) => {
      const res = await deleteCourseApi(courseId);
      return res.data;
    },
    onSuccess: () => {
      showToastSuccess("Course deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err) => {
      showToastError(err, "Failed to delete course");
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleStatusChange = (course, newStatus) => {
    if (course.status === newStatus) return;

    setConfirmModal({
      isOpen: true,
      title: "Change Course Status",
      description: `Change "${course.title}" status from "${course.status}" to "${newStatus}"?`,
      confirmText: "Update Status",
      variant: newStatus === "archived" ? "warning" : "default",
      onConfirm: () =>
        updateStatusMutation.mutate({
          courseId: course._id,
          status: newStatus,
        }),
    });
  };

  const handleDeleteCourse = (course) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Course",
      description: `Are you sure you want to delete "${course.title}"? This will soft-delete the course and hide it from students and teachers.`,
      confirmText: "Delete Course",
      variant: "danger",
      onConfirm: () => deleteCourseMutation.mutate(course._id),
    });
  };

  const resetFilters = () => {
    setStatusFilter("");
    setVisibilityFilter("");
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
  };

  const courses = data?.courses || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages || 1;
  const isFiltered = Boolean(statusFilter || visibilityFilter || debouncedSearch);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Admin Panel
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              Course Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Monitor courses across all teachers, manage publication lifecycle, and audit course status.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
            title="Refresh course list"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {/* Filters bar */}
        <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                placeholder="Search by title or code..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-black pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-black px-4 py-2.5 text-sm text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Visibility Filter */}
            <div>
              <select
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-black px-4 py-2.5 text-sm text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Reset / Count */}
            <div className="flex items-center gap-3">
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Clear Filters
                </button>
              )}
              <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                {total} {total === 1 ? "course" : "courses"} found
              </span>
            </div>
          </div>
        </section>

        {/* Error State with Retry */}
        {!isLoading && isError && (
          <div className="mt-8">
            <ErrorAlert
              error={error}
              title="Failed to load courses"
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          </div>
        )}

        {/* Courses Table */}
        {!isError && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {!isLoading && courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={isFiltered ? "No courses matching filters" : "No courses created yet"}
                description={
                  isFiltered
                    ? "Try adjusting your search criteria or resetting filters."
                    : "No courses have been created in the platform yet."
                }
                secondaryLabel={isFiltered ? "Clear Filters" : undefined}
                onSecondaryAction={isFiltered ? resetFilters : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-border)] bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <tr>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Visibility</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {isLoading && (
                      <>
                        <TableRowSkeleton columns={6} />
                        <TableRowSkeleton columns={6} />
                        <TableRowSkeleton columns={6} />
                        <TableRowSkeleton columns={6} />
                        <TableRowSkeleton columns={6} />
                      </>
                    )}

                    {!isLoading &&
                      courses.map((course) => {
                        const isPendingStatus =
                          updateStatusMutation.isPending &&
                          updateStatusMutation.variables?.courseId === course._id;
                        const isPendingDelete =
                          deleteCourseMutation.isPending &&
                          deleteCourseMutation.variables === course._id;

                        return (
                          <tr
                            key={course._id}
                            className="transition hover:bg-white/[0.02]"
                          >
                            {/* Course info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-primary)]">
                                  <BookOpen size={20} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate max-w-md">
                                    {course.title}
                                  </p>
                                  <span className="font-mono text-xs text-[var(--color-text-muted)]">
                                    {course.courseCode}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Teacher */}
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate">
                                  {course.teacher?.fullName || "Unassigned"}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] truncate">
                                  {course.teacher?.email || "—"}
                                </p>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <select
                                value={course.status}
                                onChange={(e) =>
                                  handleStatusChange(course, e.target.value)
                                }
                                disabled={isPendingStatus || isPendingDelete}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none disabled:opacity-50 ${
                                  course.status === "published"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : course.status === "draft"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                                }`}
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                              </select>
                            </td>

                            {/* Visibility */}
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  course.visibility === "public"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : "bg-neutral-800 text-neutral-400"
                                }`}
                              >
                                {course.visibility === "public" ? "Public" : "Private"}
                              </span>
                            </td>

                            {/* Created */}
                            <td className="px-6 py-4 text-xs text-[var(--color-text-muted)]">
                              {course.createdAt
                                ? new Date(course.createdAt).toLocaleDateString()
                                : "—"}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isPendingStatus || isPendingDelete ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)]">
                                    <Loader2 size={14} className="animate-spin" />
                                    Updating...
                                  </span>
                                ) : (
                                  <>
                                    <Link
                                      to={`/teacher/courses/${course._id}`}
                                      className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-white/[0.05] hover:text-white"
                                      title="View Course Details"
                                    >
                                      <ExternalLink size={16} />
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCourse(course)}
                                      className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                                      title="Delete Course"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {!isLoading && totalPages > 1 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--color-border)] px-4 py-4 sm:px-6">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Showing Page <span className="font-semibold text-white">{page}</span>{" "}
                  of <span className="font-semibold text-white">{totalPages}</span> (
                  {total} total courses)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-black px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isFetching}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-black px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isLoading={deleteCourseMutation.isPending || updateStatusMutation.isPending}
      />
    </div>
  );
};

export default AdminCourses;
