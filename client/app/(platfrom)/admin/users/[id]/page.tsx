"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, Delete02Icon as Trash2 } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrentUserQuery } from "@/context/UserContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteUser, getUser, updateUserRoles, updateUserStatus, type AdminUser } from "@/lib/admin-users";
import { getUsageForUser } from "@/lib/ai-usage";
import { toast } from "@/components/ui/toast";

const ASSIGNABLE_ROLES = ["user", "admin"];
// Next inlines NODE_ENV at build time, so this whole block is absent from a
// production bundle; the server independently refuses the request too.
const SHOW_DEV_DELETE = process.env.NODE_ENV !== "production";
const STATUS_OPTIONS: AdminUser["status"][] = ["active", "inactive", "suspended", "banned"];

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: currentUser } = useCurrentUserQuery();
  const [pending, setPending] = useState<string | null>(null);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => getUser(id),
  });

  const { data: usage } = useQuery({
    queryKey: ["admin", "ai-usage", "users", id],
    queryFn: () => getUsageForUser(id, 30),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const toggleRole = async (role: string) => {
    if (!user) return;
    const hasRole = user.roles.includes(role);
    setPending(role);
    try {
      await updateUserRoles(id, role, hasRole ? "revoke" : "grant");
      invalidate();
      toast.add({ title: `${role} ${hasRole ? "revoked" : "granted"}.`, type: "success" });
    } catch {
      toast.add({ title: "Failed to update role.", type: "error" });
    } finally {
      setPending(null);
    }
  };

  const changeStatus = async (status: string) => {
    setPending("status");
    try {
      await updateUserStatus(id, status as AdminUser["status"]);
      invalidate();
      toast.add({ title: `Status updated to ${status}.`, type: "success" });
    } catch {
      toast.add({ title: "Failed to update status.", type: "error" });
    } finally {
      setPending(null);
    }
  };

  const handleDelete = async () => {
    setPending("delete");
    try {
      await deleteUser(id);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.add({ title: "User deleted.", type: "success" });
      router.push("/admin/users");
    } catch {
      toast.add({ title: "Failed to delete user.", type: "error" });
      setPending(null);
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }
  if (isError || !user) {
    return <p className="text-xs text-destructive">User not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" />
        Back to users
      </Link>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">{user.name ?? user.email}</h2>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        <p className="text-[10px] text-muted-foreground font-mono">
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="rounded-lg border border-border px-3 py-2">
          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Memories</span>
          <span className="font-bold text-foreground">{user.stats.memoryCount}</span>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Collections</span>
          <span className="font-bold text-foreground">{user.stats.collectionCount}</span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Roles</h3>
        <div className="flex flex-wrap gap-2">
          {ASSIGNABLE_ROLES.map((role) => {
            const active = user.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                disabled={pending === role}
                onClick={() => toggleRole(role)}
                className="disabled:opacity-50"
              >
                <Badge variant={active ? "default" : "outline"} className="cursor-pointer h-6 px-3">
                  {role} {active ? "· revoke" : "· grant"}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Status</h3>
        <Select value={user.status} onValueChange={(v) => v && changeStatus(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">AI usage (last 30 days)</h3>
        {usage ? (
          <div className="flex gap-4 text-xs">
            <div className="rounded-lg border border-border px-3 py-2">
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Calls</span>
              <span className="font-bold text-foreground tabular-nums">{usage.totals.calls.toLocaleString()}</span>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Tokens</span>
              <span className="font-bold text-foreground tabular-nums">{usage.totals.totalTokens.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No AI usage recorded.</p>
        )}
      </div>

      {SHOW_DEV_DELETE && currentUser?.id !== user.id && (
        <div className="space-y-2 rounded-lg border border-destructive/30 p-4">
          <h3 className="text-xs font-bold text-destructive uppercase tracking-wide">Danger zone (dev only)</h3>
          <p className="text-[11px] text-muted-foreground">
            Permanently deletes this account and all its data immediately. Not available in production.
          </p>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" disabled={pending === "delete"} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  Delete user
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia tone="destructive">
                  <HugeiconsIcon icon={Trash2} strokeWidth={2} />
                </AlertDialogMedia>
                <AlertDialogTitle>Delete {user.email}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the account, {user.stats.memoryCount} memories, and everything else it owns. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
