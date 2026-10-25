"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

/** Signs out, then goes to the home page. `onDone` runs once the sign-out has finished, before the redirect. */
export function useLogout() {
  const router = useRouter();
  return (onDone?: () => void) => {
    logout().finally(() => {
      onDone?.();
      router.push("/");
    });
  };
}
