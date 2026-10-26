import { useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Users as UsersIcon,
  Search,
  Filter,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { getAdminUsersApi, updateAdminUserApi } from "@/api/admin.api";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/config/roles";

const Users = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    setDebouncedSearch(val);
  };

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["admin-users", page, roleFilter, statusFilter, debouncedSearch],
    queryFn: async () => {
      const params = {
        page,
        limit: 15,
      };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await getAdminUsersApi(params);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      const res = await updateAdminUserApi(userId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.role
          ? "User role updated successfully"
          : "User status updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || "Failed to update user";
      toast.error(msg);
    },
  });

  const handleRoleChange = (targetUser, newRole) => {
    if (targetUser._id === currentUser?._id) {
      toast.error("You cannot change your own role.");
      return;
    }
    if (targetUser.role === newRole) return;

    if (
      targetUser.role === ROLES.ADMIN &&
      newRole !== ROLES.ADMIN &&
      !window.confirm(
        `Are you sure you want to demote ${targetUser.fullName} from Admin to ${newRole}?`
      )
    ) {
      return;
    }

    updateUserMutation.mutate({
      userId: targetUser._id,
      data: { role: newRole },
    });
  };

  const handleStatusChange = (targetUser, newStatus) => {
    if (targetUser._id === currentUser?._id) {
      toast.error("You cannot deactivate your own account.");
      return;
    }
    if (targetUser.status === newStatus) return;

    if (
      newStatus === "inactive" &&
      !window.confirm(
        `Are you sure you want to deactivate ${targetUser.fullName}'s account?`
      )
    ) {
      return;
    }

    updateUserMutation.mutate({
      userId: targetUser._id,
      data: { status: newStatus },
    });
  };

  const resetFilters = () => {
    setRoleFilter("");
    setStatusFilter("");
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
  };

  const users = data?.users || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">
        {/* Header */}
        <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              User Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              View registered users, change platform roles, and manage access statuses.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            title="Refresh user list"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
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
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-black pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-black px-4 py-2.5 text-sm text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-center gap-3">
              {(roleFilter || statusFilter || searchTerm) && (
                <button
                  onClick={resetFilters}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Clear Filters
                </button>
              )}
              <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                {total} {total === 1 ? "user" : "users"} found
              </span>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && page === 1 && (
          <div className="mt-8 flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
              Loading users...
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-3 font-semibold text-red-300">
              Failed to load users
            </p>
            <p className="mt-1 text-sm text-red-400/80">
              {error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Users Table */}
        {!isLoading && !isError && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {users.length === 0 ? (
              <div className="p-12 text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-[var(--color-text-muted)] opacity-50" />
                <h3 className="mt-4 text-base font-semibold text-white">
                  No users found
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {searchTerm || roleFilter || statusFilter
                    ? "Try adjusting your search terms or filter criteria."
                    : "No users have been registered yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-border)] bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Email Verified</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {users.map((targetUser) => {
                      const isSelf = targetUser._id === currentUser?._id;
                      const isPending =
                        updateUserMutation.isPending &&
                        updateUserMutation.variables?.userId === targetUser._id;

                      return (
                        <tr
                          key={targetUser._id}
                          className="transition hover:bg-white/[0.02]"
                        >
                          {/* User info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] font-bold text-white">
                                {targetUser.fullName?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white truncate">
                                    {targetUser.fullName}
                                  </span>
                                  {isSelf && (
                                    <span className="rounded-md bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] truncate">
                                  {targetUser.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role Selector */}
                          <td className="px-6 py-4">
                            {isSelf ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase text-purple-400">
                                <Shield size={12} />
                                {targetUser.role}
                              </span>
                            ) : (
                              <select
                                value={targetUser.role}
                                onChange={(e) =>
                                  handleRoleChange(targetUser, e.target.value)
                                }
                                disabled={isPending}
                                className="rounded-xl border border-[var(--color-border)] bg-black px-3 py-1.5 text-xs font-medium text-white focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                              >
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                              </select>
                            )}
                          </td>

                          {/* Status Selector */}
                          <td className="px-6 py-4">
                            {isSelf ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                <CheckCircle2 size={12} />
                                Active
                              </span>
                            ) : (
                              <select
                                value={targetUser.status}
                                onChange={(e) =>
                                  handleStatusChange(targetUser, e.target.value)
                                }
                                disabled={isPending}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none disabled:opacity-50 ${
                                  targetUser.status === "active"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                                }`}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            )}
                          </td>

                          {/* Verified */}
                          <td className="px-6 py-4">
                            {targetUser.isEmailVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                                <CheckCircle2 size={14} />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                                <XCircle size={14} />
                                Unverified
                              </span>
                            )}
                          </td>

                          {/* Joined */}
                          <td className="px-6 py-4 text-xs text-[var(--color-text-muted)]">
                            {targetUser.createdAt
                              ? new Date(targetUser.createdAt).toLocaleDateString()
                              : "—"}
                          </td>

                          {/* Action indicator */}
                          <td className="px-6 py-4 text-right">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)]">
                                <Loader2 size={14} className="animate-spin" />
                                Saving...
                              </span>
                            ) : isSelf ? (
                              <span className="text-xs text-[var(--color-text-muted)]">
                                Protected
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--color-text-muted)]">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--color-border)] px-6 py-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Showing Page <span className="font-semibold text-white">{page}</span>{" "}
                  of <span className="font-semibold text-white">{totalPages}</span> (
                  {total} total users)
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
    </div>
  );
};

export default Users;
