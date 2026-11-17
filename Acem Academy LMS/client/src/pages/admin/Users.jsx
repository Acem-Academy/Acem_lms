import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { getAdminUsersApi, updateAdminUserApi } from "@/api/admin.api";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/config/roles";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import ErrorAlert from "@/components/common/ErrorAlert";
import EmptyState from "@/components/common/EmptyState";
import ConfirmModal from "@/components/common/ConfirmModal";
import { showToastSuccess, showToastError } from "@/utils/errorHandler";

const Users = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
      showToastSuccess(
        variables.data.role
          ? "User role updated successfully"
          : "User status updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err) => {
      showToastError(err, "Failed to update user");
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleRoleChange = (targetUser, newRole) => {
    if (targetUser._id === currentUser?._id) {
      showToastError(null, "You cannot change your own role.");
      return;
    }
    if (targetUser.role === newRole) return;

    if (targetUser.role === ROLES.ADMIN && newRole !== ROLES.ADMIN) {
      setConfirmModal({
        isOpen: true,
        title: "Demote Administrator",
        description: `Are you sure you want to demote ${targetUser.fullName} from Admin to ${newRole}? Make sure another active administrator remains.`,
        confirmText: "Demote User",
        variant: "danger",
        onConfirm: () =>
          updateUserMutation.mutate({
            userId: targetUser._id,
            data: { role: newRole },
          }),
      });
      return;
    }

    updateUserMutation.mutate({
      userId: targetUser._id,
      data: { role: newRole },
    });
  };

  const handleStatusChange = (targetUser, newStatus) => {
    if (targetUser._id === currentUser?._id) {
      showToastError(null, "You cannot deactivate your own account.");
      return;
    }
    if (targetUser.status === newStatus) return;

    if (newStatus === "inactive") {
      setConfirmModal({
        isOpen: true,
        title: "Deactivate User Account",
        description: `Are you sure you want to deactivate ${targetUser.fullName}'s account? The user will be prevented from logging in.`,
        confirmText: "Deactivate",
        variant: "warning",
        onConfirm: () =>
          updateUserMutation.mutate({
            userId: targetUser._id,
            data: { status: newStatus },
          }),
      });
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
  const isFiltered = Boolean(roleFilter || statusFilter || debouncedSearch);

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
              User Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              View registered users, change platform roles, and manage access statuses.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
            title="Refresh user list"
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
              {isFiltered && (
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

        {/* Error State with Retry */}
        {!isLoading && isError && (
          <div className="mt-8">
            <ErrorAlert
              error={error}
              title="Failed to load users"
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          </div>
        )}

        {/* Users Table */}
        {!isError && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {!isLoading && users.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title={isFiltered ? "No users matching filters" : "No users registered"}
                description={
                  isFiltered
                    ? "Try adjusting your search terms or clearing role and status filters."
                    : "There are currently no users in the database."
                }
                secondaryLabel={isFiltered ? "Clear Filters" : undefined}
                onSecondaryAction={isFiltered ? resetFilters : undefined}
              />
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
                      users.map((targetUser) => {
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
            {!isLoading && totalPages > 1 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--color-border)] px-4 py-4 sm:px-6">
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isLoading={updateUserMutation.isPending}
      />
    </div>
  );
};

export default Users;
