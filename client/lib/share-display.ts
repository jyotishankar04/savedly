import {
  Globe02Icon as Globe,
  LockPasswordIcon as Lock,
  UserLockIcon as UserLock,
  CircleLockIcon as Restricted,
} from "@hugeicons/core-free-icons";
import type { ShareLinkAccess } from "@/lib/shares";

/**
 * Display metadata for the four link modes — label, icon, badge tone.
 * Shared between /app/shared and its per-share analytics page so the two
 * don't drift into describing the same mode two different ways.
 */
export const LINK_MODE_META: Record<ShareLinkAccess, { label: string; icon: typeof Globe; tone: string }> = {
  disabled: { label: "Invite only", icon: Restricted, tone: "bg-muted text-muted-foreground" },
  request: { label: "On request", icon: UserLock, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  password: { label: "Password", icon: Lock, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  public: { label: "Public", icon: Globe, tone: "bg-primary/10 text-primary" },
};
