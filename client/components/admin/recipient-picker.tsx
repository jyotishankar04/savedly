"use client";

import { useQuery } from "@tanstack/react-query";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { listUsers, type AdminUser } from "@/lib/admin-users";

/** A searchable list of users to tick, for choosing who an admin email goes to. */
export function RecipientPicker({
  open,
  onOpenChange,
  selected,
  onToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Map<string, AdminUser>;
  onToggle: (user: AdminUser) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", "picker"],
    queryFn: () => listUsers({ limit: 100 }),
    enabled: open,
  });
  const users = data?.items ?? [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Select recipients" description="Search users to add or remove them.">
      <CommandInput placeholder="Search users..." />
      <CommandList>
        {isLoading ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">Loading…</div>
        ) : (
          <>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem key={user.id} value={`${user.name ?? ""} ${user.email}`} data-checked={selected.has(user.id)} onSelect={() => onToggle(user)}>
                  <span className="truncate">{user.name ?? user.email}</span>
                  <span className="ml-auto truncate text-[10px] text-muted-foreground">{user.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
