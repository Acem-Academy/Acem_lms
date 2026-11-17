import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

import { getDashboardStatsApi } from "@/api/admin.api";
import { ROUTES } from "@/config/routes";
import { StatCardSkeleton } from "@/components/common/Skeletons";
import ErrorAlert from "@/components/common/ErrorAlert";
import EmptyState from "@/components/common/EmptyState";

const Dashboard = () => {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const result = await getDashboardStatsApi();
      return result.data;
    },
  });

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      description: "Registered platform users",
      icon: Users,
      link: ROUTES.ADMIN.USERS,
    },
    {
      title: "Total Courses",
      value: stats?.totalCourses ?? 0,
      description: "Created LMS courses",
      icon: BookOpen,
      link: ROUTES.ADMIN.COURSES,
    },
    {
      title: "Total Enrollments",
      value: stats?.totalEnrollments ?? 0,
      description: "Active learner enrollments",
      icon: GraduationCap,
    },
    {
      title: "Active Users",
      value: stats?.activeUsers ?? 0,
      description: "Currently active accounts",
      icon: CheckCircle2,
    },
  ];

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
              System Overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Real-time platform metrics, user distribution, and course performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
              title="Refresh statistics"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to={ROUTES.ADMIN.USERS}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
            >
              <Users size={16} />
              Manage Users
            </Link>
          </div>
        </section>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="mt-8 space-y-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]" />
              <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]" />
              <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]" />
            </div>
          </div>
        )}

        {/* Error State with Retry */}
        {!isLoading && isError && (
          <div className="mt-8">
            <ErrorAlert
              error={error}
              title="Failed to load dashboard statistics"
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <div className="mt-8 space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.title}
                    className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition hover:border-[var(--color-border-hover)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-muted)]">
                          {card.title}
                        </p>
                        <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">
                          {card.value}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {card.description}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-primary)]">
                        <IconComponent size={22} />
                      </div>
                    </div>
                    {card.link && (
                      <Link
                        to={card.link}
                        className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:underline"
                      >
                        View details
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Breakdowns Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Users by Role */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-[var(--color-primary)]" />
                    Users by Role
                  </h2>
                  <Link
                    to={ROUTES.ADMIN.USERS}
                    className="text-xs font-medium text-[var(--color-text-muted)] hover:text-white"
                  >
                    Manage
                  </Link>
                </div>
                {stats?.usersByRole?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {stats.usersByRole.map((item) => (
                      <div
                        key={item.role}
                        className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.05]"
                      >
                        <span className="capitalize font-medium text-sm text-neutral-300">
                          {item.role}
                        </span>
                        <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                    No user distribution data available.
                  </p>
                )}
              </div>

              {/* Courses by Status */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-[var(--color-primary)]" />
                    Courses by Status
                  </h2>
                  <Link
                    to={ROUTES.ADMIN.COURSES}
                    className="text-xs font-medium text-[var(--color-text-muted)] hover:text-white"
                  >
                    View All
                  </Link>
                </div>
                {stats?.coursesByStatus?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {stats.coursesByStatus.map((item) => {
                      const isPublished = item.status === "published";
                      const isDraft = item.status === "draft";
                      return (
                        <div
                          key={item.status}
                          className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.05]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isPublished
                                  ? "bg-emerald-400"
                                  : isDraft
                                  ? "bg-amber-400"
                                  : "bg-neutral-500"
                              }`}
                            />
                            <span className="capitalize font-medium text-sm text-neutral-300">
                              {item.status}
                            </span>
                          </div>
                          <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-bold text-white">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                    No course status data available.
                  </p>
                )}
              </div>

              {/* Top Enrolled Courses */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-[var(--color-primary)]" />
                    Popular Courses
                  </h2>
                  <Link
                    to={ROUTES.ADMIN.COURSES}
                    className="text-xs font-medium text-[var(--color-text-muted)] hover:text-white"
                  >
                    View All
                  </Link>
                </div>
                {stats?.enrollmentsByCourse?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {stats.enrollmentsByCourse.slice(0, 5).map((item) => (
                      <div
                        key={item.courseId}
                        className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.05]"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-sm font-medium text-white">
                            {item.title}
                          </p>
                          {item.courseCode && (
                            <p className="text-xs text-[var(--color-text-muted)] font-mono">
                              {item.courseCode}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                          {item.count} {item.count === 1 ? "student" : "students"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                    No enrollment activity recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
