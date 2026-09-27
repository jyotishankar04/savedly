"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as Search, ArrowRight01Icon as ArrowRight, ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUsers, type AdminUser } from "@/lib/admin-users";
import { listAdminPlans } from "@/lib/admin-plans";

const STATUS_VARIANT: Record<AdminUser["status"], "secondary" | "destructive" | "outline"> = {
  active: "secondary",
  inactive: "outline",
  suspended: "destructive",
  banned: "destructive",
  deleted: "outline",
};

const COLUMN_COUNT = 5;

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [role, setRole] = useState<string>("all");
  const [plan, setPlan] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : (status as AdminUser["status"]),
    role: role === "all" ? undefined : role,
    plan: plan === "all" ? undefined : plan,
    page,
    limit,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => listUsers(params),
  });

  // Real, admin-configurable plans — never a hardcoded Free/Plus/Pro list,
  // so a renamed or newly-added plan shows up here without a code change.
  const { data: plansList } = useQuery({ queryKey: ["admin", "plans"], queryFn: listAdminPlans });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-foreground">Users</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <HugeiconsIcon icon={Search} strokeWidth={2.25} className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by email or name..."
            className="pl-7"
          />
        </div>

        <Select items={{ all: "All statuses", active: "Active", inactive: "Inactive", suspended: "Suspended", banned: "Banned" }} value={status} onValueChange={(v) => { if (v) { setStatus(v); setPage(1); } }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>

        <Select items={{ all: "All roles", user: "user", admin: "admin" }} value={role} onValueChange={(v) => { if (v) { setRole(v); setPage(1); } }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={plan} onValueChange={(v) => { if (v) { setPlan(v); setPage(1); } }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Plan">
              {() => (plan === "all" ? "All plans" : plansList?.find((p) => p.key === plan)?.name)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {plansList?.filter((p) => p.isActive).map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">User</th>
              <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Roles</th>
              <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Plan</th>
              <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Status</th>
              <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-4 py-6 text-center text-destructive">
                  Failed to load users.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-4 py-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
            {data?.items.map((user) => (
              <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${user.id}`} className="flex flex-col hover:text-primary transition-colors">
                    <span className="text-xs font-semibold text-foreground">{user.name ?? user.email}</span>
                    <span className="text-[10px] text-muted-foreground">{user.email}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{user.planName ?? "—"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[user.status]}>{user.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {data.total} user{data.total === 1 ? "" : "s"} · page {data.page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-6 w-6 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-6 w-6 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
