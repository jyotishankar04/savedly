"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/admin-users";
import { Section } from "./fields";

/** Everyone active, or the users picked by hand. */
export function RecipientsSection({
  sendToAll,
  onSendToAllChange,
  selectedUsers,
  onRemoveUser,
  onChoose,
}: {
  sendToAll: boolean;
  onSendToAllChange: (all: boolean) => void;
  selectedUsers: Map<string, AdminUser>;
  onRemoveUser: (id: string) => void;
  onChoose: () => void;
}) {
  return (
          <Section title="Recipients">
            <div className="flex gap-2">
              {[
                { all: true, name: "All active users" },
                { all: false, name: "Select users" },
              ].map((option) => (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={sendToAll === option.all}
                  onClick={() => onSendToAllChange(option.all)}
                  className={cn(
                    "h-9 flex-1 rounded-full border text-xs font-semibold transition-colors",
                    sendToAll === option.all ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>

            {!sendToAll && (
              <div className="space-y-2">
                <Button type="button" variant="outline" size="lg" onClick={onChoose}>
                  {selectedUsers.size > 0 ? `${selectedUsers.size} selected. Edit` : "Choose recipients…"}
                </Button>
                {selectedUsers.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedUsers.values()).map((user) => (
                      <span key={user.id} className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]">
                        {user.name ?? user.email}
                        <button
                          type="button"
                          aria-label={`Remove ${user.name ?? user.email}`}
                          onClick={() => onRemoveUser(user.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>
  );
}
