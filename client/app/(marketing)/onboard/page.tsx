"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check, ArrowRight01Icon as ArrowRight, PuzzleIcon as Puzzle, Upload01Icon as Upload, KeyboardIcon as Keyboard, Key01Icon as Key, SlidersHorizontalIcon as Sliders } from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getServerConfig } from "@/lib/server-config";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/user";
import { useCurrentUserQuery, useSetCurrentUser } from "@/context/UserContext";
import { useCreateMemoryMutation } from "@/context/MemoryContext";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { Logo } from "@/components/logo";

// Step 2 Interests
const interests = [
  { id: "inspiration", label: "Inspiration", desc: "Websites, designs & ideas", icon: "🎨" },
  { id: "learning", label: "Learning", desc: "Tutorials, courses & resources", icon: "💻" },
  { id: "ideas", label: "Ideas", desc: "Things you want to build", icon: "💡" },
  { id: "research", label: "Research", desc: "Articles, papers & references", icon: "🔬" },
  { id: "content", label: "Content", desc: "Videos, reels & posts", icon: "🎬" },
];

// Step 3 Content Options
const saveTypes = [
  "Websites", "Videos", "Articles", "Screenshots", "GitHub repos", 
  "Social posts", "Notes", "Ideas", "Products", "Books", "Courses", "Tools"
];

// Step 5 Ways to save — informational only; each is a real capture path.
const captureChannels = [
  { label: "Browser extension", desc: "Save the current page with Ctrl/Cmd + Shift + S", icon: Puzzle },
  { label: "Quick Capture", desc: "Press Ctrl/Cmd + Q anywhere in the dashboard", icon: Keyboard },
  { label: "Import bookmarks", desc: "Bring in an exported bookmarks file from Import", icon: Upload },
];

function OnboardingFlow() {
  // Hosted plans run on AI we supply; only a self-hosted install asks for keys.
  const { data: serverConfig } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const selfHosted = !!serverConfig?.selfHosted;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Someone who arrived from a shared link finishes on that link rather
  // than a generic dashboard. The OAuth callback puts ?next here, and only
  // ever after validating it against an exact /s/<slug> allowlist — this
  // re-checks the same shape, since by the time it reaches the browser it
  // is once again just a query param anyone can edit.
  const requestedNext = searchParams.get("next");
  const nextDestination = requestedNext && /^\/s\/[A-Za-z0-9_-]{1,32}$/.test(requestedNext) ? requestedNext : "/app";
  const [step, setStep] = useState(1);
  const progressWidth = `${Math.min((step / 7) * 100, 100)}%`;

  // Form State
  const [name, setName] = useState("");
  const [useFor, setUseFor] = useState<string[]>([]);
  const [saveMost, setSaveMost] = useState<string[]>([]);
  const [orgMode, setOrgMode] = useState<"auto" | "manual">("auto");
  const [customLink, setCustomLink] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auth guard: onboarding answers are saved to the signed-in user's account.
  // The access token lives in an httpOnly cookie, so this asks /auth/me
  // rather than checking local storage — anyone not signed in gets sent to
  // login. useCurrentUserQuery only surfaces a real 401 as an error; a
  // transient network/server hiccup (e.g. the dev server mid-restart) gets a
  // few retries first instead of an instant redirect.
  const { data: currentUser, isLoading: isAuthLoading, isError: isAuthError } = useCurrentUserQuery();
  const setCurrentUser = useSetCurrentUser();

  useEffect(() => {
    if (!isAuthLoading && isAuthError) {
      router.replace("/auth/login");
    }
  }, [isAuthLoading, isAuthError, router]);

  // Someone who already finished onboarding (a stale bookmark, a back-button
  // press after step 7, a shared link) shouldn't be able to silently redo it
  // — it would overwrite their saved preferences and file another "first
  // memory" from whatever's left in the last step's box. Send them where
  // onboarding itself would have sent them.
  useEffect(() => {
    if (currentUser?.onboardingCompleted) {
      router.replace(nextDestination);
    }
  }, [currentUser?.onboardingCompleted, nextDestination, router]);

  const completeOnboardingMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: setCurrentUser,
  });
  const createMemoryMutation = useCreateMemoryMutation();

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === 1 && e.key === "Enter" && name.trim()) {
        e.preventDefault();
        setStep(2);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, name]);

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLink.trim() || completeOnboardingMutation.isPending) return;

    setSubmitError(null);
    try {
      await completeOnboardingMutation.mutateAsync({
        name: name.trim(),
        interests: useFor,
        contentTypes: saveMost,
        organizeMode: orgMode,
      });
      // Whatever the user typed/pasted in the "save something" box is a real
      // memory, not just onboarding decoration — save it the same way
      // capture/page.tsx does, so it's not silently discarded once onboarding
      // completes.
      const detectedType = detectMemoryType({ text: customLink, attachmentMimeType: null });
      const { url: extractedUrl, caption } = splitLinkAndCaption(customLink);
      const isLink = detectedType === "web" || detectedType === "video";
      try {
        await createMemoryMutation.mutateAsync({
          type: detectedType,
          title: deriveTitle(detectedType, customLink, null),
          url: isLink ? extractedUrl?.href : undefined,
          content: detectedType === "note" ? customLink.trim() || undefined : isLink ? caption || undefined : undefined,
        });
      } catch {
        // Onboarding itself already succeeded — don't block entry to the app
        // over the bonus first-memory save failing.
      }
      setStep(7);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't save your preferences. Please try again.");
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 7));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      
      {/* Top Header & Progress */}
      <div className="w-full px-6 py-4 bg-background border-b border-border/20 flex flex-col gap-3 shrink-0">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <Logo className="text-sm" />
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
            ONBOARDING &middot; STEP {step.toString().padStart(2, "0")} / 07
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full max-w-6xl mx-auto h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      {/* Main Content Area: Content is placed straight on the background */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:py-20 w-full max-w-2xl mx-auto">
        
        {/* STEP 1: Name Input (No border, no ring) */}
        {step === 1 && (
          <div className="w-full space-y-12 text-center animate-fade-in my-auto">
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                Welcome to Savedly
              </span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground pt-2">
                What&apos;s your name?
              </h2>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-foreground text-center text-4xl md:text-5xl font-semibold border-none ring-0 outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/20"
              />
              <p className="text-[10px] text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 border border-border bg-muted rounded text-[9px] font-mono">Enter</kbd> to continue
              </p>
            </div>

            <Button
              onClick={nextStep}
              disabled={!name.trim()}
              className="w-full max-w-md h-12 rounded-full font-medium shadow-xs"
            >
              Continue
            </Button>
          </div>
        )}

        {/* STEP 2: Use Cases */}
        {step === 2 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                What will you use Savedly for?
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose what you want Savedly to help you remember.
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {interests.map((item) => {
                const isSelected = useFor.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setUseFor((prev) => 
                        prev.includes(item.id) 
                          ? prev.filter((id) => id !== item.id) 
                          : [...prev, item.id]
                      );
                    }}
                    className={cn(
                      "rounded-xl border p-0.5 cursor-pointer transition-all duration-200 select-none",
                      isSelected 
                        ? "border-primary/40 bg-primary/5 shadow-xs" 
                        : "border-border/45 bg-muted/75 dark:border-border/65"
                    )}
                  >
                    <div 
                      className={cn(
                        "p-4 rounded-lg border bg-card flex items-center justify-between transition-colors",
                        isSelected ? "border-primary/50 shadow-xs" : "border-border/75"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{item.label}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>

                      <div 
                        className="h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                        style={{ 
                          borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                          backgroundColor: isSelected ? "var(--color-primary)" : "transparent"
                        }}
                      >
                        {isSelected && <HugeiconsIcon icon={Check} strokeWidth={2.25} className="h-2.5 w-2.5 text-white stroke-[3.5]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <Button variant="ghost" onClick={prevStep} className="flex-1 h-11 rounded-full font-medium">
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="flex-1 h-11 rounded-full font-medium shadow-xs"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Content types to save */}
        {step === 3 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                What do you save most?
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick a few things you never want to lose.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {saveTypes.map((type) => {
                const isSelected = saveMost.includes(type);
                return (
                  <div
                    key={type}
                    onClick={() => {
                      setSaveMost((prev) => 
                        prev.includes(type) 
                          ? prev.filter((t) => t !== type) 
                          : [...prev, type]
                      );
                    }}
                    className={cn(
                      "rounded-lg border p-0.5 cursor-pointer transition-all duration-200 select-none text-center",
                      isSelected 
                        ? "border-primary/40 bg-primary/5 shadow-xs" 
                        : "border-border/45 bg-muted/75 dark:border-border/65"
                    )}
                  >
                    <div
                      className={cn(
                        "px-3 py-2.5 rounded border bg-card flex items-center justify-center gap-1.5 transition-colors text-[10px] font-bold uppercase tracking-wider text-foreground",
                        isSelected ? "border-primary/50 shadow-xs" : "border-border/75"
                      )}
                    >
                      {isSelected && <span className="text-primary font-bold">✓</span>}
                      <span>{type}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <Button variant="ghost" onClick={prevStep} className="flex-1 h-11 rounded-full font-medium">
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="flex-1 h-11 rounded-full font-medium shadow-xs"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Organization mode */}
        {step === 4 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                How should Savedly organize your memories?
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Savedly can understand what you save and organize it without folders or manual tags.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              
              {/* Option 1: Automatic */}
              <div
                onClick={() => setOrgMode("auto")}
                className={cn(
                  "rounded-xl border p-0.5 cursor-pointer transition-all duration-200 select-none",
                  orgMode === "auto" 
                    ? "border-primary/40 bg-primary/5 shadow-xs" 
                    : "border-border/45 bg-muted/75 dark:border-border/65"
                )}
              >
                <div
                  className={cn(
                    "p-4 rounded-lg border bg-card flex items-center justify-between transition-colors relative",
                    orgMode === "auto" ? "border-primary/50 shadow-xs" : "border-border/75"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-1 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                      <LogoMark ticks={false} className="h-[18px] w-[18px]" />
                    </div>
                    <div className="pr-6">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground">Automatically</h4>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                        Let Savedly understand and organize everything for you. No tags or folders to maintain.
                        {selfHosted ? " Needs an AI key, which you can connect after setup." : ""}
                      </p>
                    </div>
                  </div>

                  <div 
                    className="h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0"
                    style={{ 
                      borderColor: orgMode === "auto" ? "var(--color-primary)" : "var(--color-border)",
                    }}
                  >
                    {orgMode === "auto" && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Manual */}
              <div
                onClick={() => setOrgMode("manual")}
                className={cn(
                  "rounded-xl border p-0.5 cursor-pointer transition-all duration-200 select-none",
                  orgMode === "manual" 
                    ? "border-primary/40 bg-primary/5 shadow-xs" 
                    : "border-border/45 bg-muted/75 dark:border-border/65"
                )}
              >
                <div
                  className={cn(
                    "p-4 rounded-lg border bg-card flex items-center justify-between transition-colors",
                    orgMode === "manual" ? "border-primary/50 shadow-xs" : "border-border/75"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-1 rounded-lg bg-muted text-muted-foreground mt-0.5 shrink-0">
                      <HugeiconsIcon icon={Sliders} strokeWidth={2.25} className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">My way</h4>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                        I&apos;ll organize things myself. I prefer manual folder hierarchies and manual tag collections.
                      </p>
                    </div>
                  </div>

                  <div 
                    className="h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0"
                    style={{ 
                      borderColor: orgMode === "manual" ? "var(--color-primary)" : "var(--color-border)",
                    }}
                  >
                    {orgMode === "manual" && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <Button variant="ghost" onClick={prevStep} className="flex-1 h-11 rounded-full font-medium">
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="flex-1 h-11 rounded-full font-medium shadow-xs"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Connect first way to save */}
        {step === 5 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                Ways to save
              </h2>
              <p className="text-sm text-muted-foreground">
                Three quick ways to get things in — you can use any of them later.
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {captureChannels.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="rounded-xl border border-border/45 bg-muted/75 p-0.5 shadow-xs hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="p-3.5 rounded-lg border border-border/75 bg-card flex items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                          <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground leading-none">{item.label}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-none">{item.desc}</p>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3 max-w-md mx-auto pt-4">
              <Button 
                onClick={nextStep} 
                className="w-full h-11 rounded-full font-medium shadow-xs"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: Save First Memory (No border, no ring) */}
        {step === 6 && (
          <div className="w-full space-y-12 text-center animate-fade-in my-auto">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground">
                Save something you want to remember.
              </h2>
              <p className="text-sm text-muted-foreground">
                Paste a link, write a thought, or drop something you&apos;ve discovered.
              </p>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-8 max-w-md mx-auto w-full">
              <textarea
                placeholder="Paste a link or write something..."
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                required
                rows={2}
                className="w-full bg-transparent text-foreground text-center text-2xl md:text-3xl font-medium border-none ring-0 outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/20 resize-none leading-relaxed"
              />
              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}
              <Button
                type="submit"
                disabled={completeOnboardingMutation.isPending}
                className="w-full h-12 rounded-full font-medium shadow-md"
              >
                {completeOnboardingMutation.isPending ? "Saving..." : "Add to Savedly"}
              </Button>
            </form>
          </div>
        )}

        {/* STEP 7: Ready */}
        {step === 7 && (
          <div className="my-auto w-full max-w-md text-center space-y-10 animate-fade-in flex flex-col items-center">
            
            {/* Minimal icon */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/25 rounded-full blur-xl animate-pulse" />
              <div className="w-14 h-14 rounded-2xl border border-primary/40 flex items-center justify-center bg-card shadow-md">
                <LogoMark className="h-9 w-9" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                Your memory is ready.
              </h2>
              <div className="text-sm text-muted-foreground space-y-1 leading-relaxed">
                <p>Save anything.</p>
                <p>Find everything.</p>
                <p className="font-semibold text-foreground">Never lose a good idea again.</p>
              </div>
            </div>

            <Button
              onClick={() => router.push(nextDestination)}
              className="w-full max-w-xs h-11 rounded-full font-medium flex items-center justify-center gap-1.5 shadow-md"
            >
              Enter Savedly <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
            </Button>

{selfHosted && (
            <div className="w-full max-w-xs rounded-xl border border-border/60 bg-muted/20 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <HugeiconsIcon icon={Key} strokeWidth={2.25} className="h-4 w-4 text-primary" />
                Turn on the smart features
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Summaries, auto-tags, and Ask use your own AI key. Saving and keyword search work without one.
              </p>
              <div className="flex gap-3 text-[11px] font-medium">
                <Link href="/app/settings/ai" className="text-primary hover:underline">Connect a key</Link>
                <Link href="/help" className="text-muted-foreground hover:text-foreground hover:underline">Help Center</Link>
              </div>
            </div>
            )}
          </div>
        )}

      </main>

      {/* Global CSS style tags for step transitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
      `}</style>

    </div>
  );
}

/**
 * useSearchParams() opts a page out of static prerendering unless it sits
 * under a Suspense boundary — `next build` fails on it, `next dev` does
 * not. The flow itself renders nothing meaningful until the auth check
 * resolves, so a null fallback costs nothing here.
 */
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingFlow />
    </Suspense>
  );
}
