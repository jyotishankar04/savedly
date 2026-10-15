import { cn } from "@/lib/utils";

/**
 * Chrome's own four-colour mark, for the "Add to Chrome" buttons (the Chrome
 * Web Store's guidelines expect it there). Drawn here rather than loaded, so
 * it's sharp at any size and needs no request: three segments around a white
 * ring and the blue centre.
 */
export function ChromeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("h-4 w-4 shrink-0", className)}>
      <path fill="#EA4335" d="M12 7h9.798A11 11 0 0 0 2.771 6.015L7.67 14.5A5 5 0 0 1 12 7Z" />
      <path fill="#FBBC04" d="M16.33 14.5l-4.899 8.485A11 11 0 0 0 21.798 7H12a5 5 0 0 1 4.33 7.5Z" />
      <path fill="#34A853" d="M7.67 14.5 2.771 6.015a11 11 0 0 0 8.66 16.97L16.33 14.5a5 5 0 0 1-8.66 0Z" />
      <circle cx="12" cy="12" r="5" fill="#fff" />
      <circle cx="12" cy="12" r="4" fill="#1A73E8" />
    </svg>
  );
}
