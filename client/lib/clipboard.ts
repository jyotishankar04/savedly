import { toast } from "@/components/ui/toast";

/**
 * Copy text and tell the user it happened.
 *
 * The guard matters: `navigator.clipboard` is undefined on insecure origins
 * and in some embedded webviews, where reading `.writeText` off it throws
 * rather than returning a rejected promise. Failing silently would be worse
 * than saying so, hence the error toast.
 */
export async function copyToClipboard(text: string, label = "Link copied"): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    toast.add({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", type: "error" });
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: label, type: "success" });
    return true;
  } catch {
    toast.add({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", type: "error" });
    return false;
  }
}
