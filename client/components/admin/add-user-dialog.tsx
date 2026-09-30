"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/auth";
import { createUser } from "@/lib/admin-users";
import { toast } from "@/components/ui/toast";

/**
 * Adds an account with a password the admin passes on. Works with public
 * signups off — that's the point on a private install.
 */
export function AddUserDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setAdmin(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const user = await createUser({ name, email, password, role: admin ? "admin" : "user" });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.add({ title: `Added ${user.email}. Send them their password.`, type: "success" });
      setOpen(false);
      reset();
      router.push(`/admin/users/${user.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add the user. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm">Add user</Button>} />
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add a user</DialogTitle>
            <DialogDescription>
              They sign in with this email and password. Give them the password yourself; you can set a new one from their page later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="add-user-name">Name</Label>
              <Input id="add-user-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-user-email">Email</Label>
              <Input id="add-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-user-password">Password</Label>
              <Input
                id="add-user-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} className="accent-primary" />
              Make them an admin too
            </label>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
