import { NextResponse } from "next/server";

// The share target's form POST is normally answered by the service worker
// (public/sw.js), which can keep a shared file. This is the fallback for the
// rare share that arrives before the worker is active: the text and link
// still reach the capture page; a file can't be carried through a redirect.
export async function POST(request: Request) {
  const params = new URLSearchParams();
  try {
    const form = await request.formData();
    for (const key of ["title", "text", "url"]) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
  } catch {
    // Open the capture page empty.
  }
  const query = params.toString();
  return NextResponse.redirect(new URL(`/app/capture${query ? `?${query}` : ""}`, request.url), 303);
}
