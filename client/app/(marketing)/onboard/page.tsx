"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check, ArrowRight01Icon as ArrowRight, PuzzleIcon as Puzzle, Upload01Icon as Upload, KeyboardIcon as Keyboard, Key01Icon as Key, SlidersHorizontalIcon as Sliders } from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getServerConfig } from "@/lib/server-config";
import { ChromeLogo } from "@/components/chrome-logo";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/user";
import { useCurrentUserQuery, useSetCurrentUser } from "@/context/UserContext";
import { useCreateMemoryMutation } from "@/context/MemoryContext";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { Logo } from "@/components/logo";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { CHROME_WEB_STORE_URL } from "@/lib/extension";

// Step 2: what they'll use Savedly for. There used to be a second question
// ("What do you save most?") with twelve chips; it asked nearly the same
// thing, so its answer is now read off this one (`types`, saved as the
// onboarding contentTypes).
const interests = [
  { id: "inspiration", label: "Inspiration", desc: "Websites, designs & ideas", icon: "🎨", types: ["Websites", "Screenshots"] },
  { id: "learning", label: "Learning", desc: "Tutorials, courses & resources", icon: "💻", types: ["Courses", "Videos", "Books"] },
  { id: "ideas", label: "Ideas", desc: "Things you want to build", icon: "💡", types: ["Notes", "Ideas"] },
  { id: "research", label: "Research", desc: "Articles, papers & references", icon: "🔬", types: ["Articles", "GitHub repos", "Tools"] },
  { id: "content", label: "Content", desc: "Videos, reels & posts", icon: "🎬", types: ["Videos", "Social posts"] },
];

// Step 5 Ways to save — informational only; each is a real capture path.
const captureChannels = [
  { label: "Browser extension", desc: "Save the current page with Ctrl/Cmd + Shift + S", icon: Puzzle },
  { label: "Quick Capture", desc: "Press Ctrl/Cmd + Q anywhere in the dashboard", icon: Keyboard },
  { label: "Import bookmarks", desc: "Bring in an exported bookmarks file from Import", icon: Upload },
];

// Step 7: ideas for a first save, for anyone staring at an empty box. Each
// one only changes the hint and focuses the box; nothing is typed for them.
const firstSavePrompts = [
  { label: "A link you meant to read", hint: "Paste the link here" },
  { label: "An idea you had", hint: "Write the idea down, in a line or two" },
  { label: "Something you'll need later", hint: "A quote, a name, a book, a number…" },
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

  // Step 6 suggests the Chrome extension, and only to someone on a desktop
  // Chromium browser who doesn't have it; everyone else goes from 5 to 7,
  // and the counter shows seven steps instead of eight.
  const extensionStatus = useExtensionStatus();
  const showExtensionStep = extensionStatus === "missing" || extensionStatus === "checking";
  const [extensionOpened, setExtensionOpened] = useState(false);
  const stepOrder = showExtensionStep ? [1, 2, 4, 5, 6, 7, 8] : [1, 2, 4, 5, 7, 8];
  const totalSteps = stepOrder.length;
  const displayStep = Math.max(stepOrder.indexOf(step), 0) + 1;
  const progressWidth = `${Math.min((displayStep / totalSteps) * 100, 100)}%`;

  // Form State
  const [name, setName] = useState("");
  const [useFor, setUseFor] = useState<string[]>([]);
  const [orgMode, setOrgMode] = useState<"auto" | "manual">("auto");
  const [customLink, setCustomLink] = useState("");
  const [firstSavePrompt, setFirstSavePrompt] = useState<number | null>(null);
  const firstSaveBox = React.useRef<HTMLTextAreaElement>(null);
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

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLink.trim()) return;
    void finishOnboarding(true);
  };

  // The first save is optional: "Skip for now" finishes without one.
  const finishOnboarding = async (withMemory: boolean) => {
    if (completeOnboardingMutation.isPending) return;

    setSubmitError(null);
    try {
      await completeOnboardingMutation.mutateAsync({
        name: name.trim(),
        interests: useFor,
        contentTypes: [...new Set(interests.filter((item) => useFor.includes(item.id)).flatMap((item) => item.types))],
        organizeMode: orgMode,
      });
      // Whatever the user typed/pasted in the "save something" box is a real
      // memory, not just onboarding decoration — save it the same way
      // capture/page.tsx does, so it's not silently discarded once onboarding
      // completes.
      if (!withMemory) {
        setStep(8);
        return;
      }
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
      setStep(8);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't save your preferences. Please try again.");
    }
  };

  const nextStep = () => setStep((prev) => stepOrder[Math.min(stepOrder.indexOf(prev) + 1, stepOrder.length - 1)]);
  const prevStep = () => setStep((prev) => stepOrder[Math.max(stepOrder.indexOf(prev) - 1, 0)]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      
      {/* Top Header & Progress */}
      <div className="w-full px-6 py-4 bg-background border-b border-border/20 flex flex-col gap-3 shrink-0">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <Logo className="text-sm" />
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
            ONBOARDING &middot; STEP {displayStep.toString().padStart(2, "0")} / {totalSteps.toString().padStart(2, "0")}
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

        {/* STEP 2: What it's for (one tap each, or one for everything) */}
        {step === 2 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                What will you use Savedly for?
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick any that fit. You can skip this.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
              {[...interests, { id: "all", label: "A bit of everything", desc: "All of the above", icon: "✨" }].map((item) => {
                const all = item.id === "all";
                const isSelected = all ? useFor.length === interests.length : useFor.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (all) {
                        setUseFor(isSelected ? [] : interests.map((i) => i.id));
                        return;
                      }
                      setUseFor((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
                    }}
                    className={cn(
                      "relative flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isSelected
                        ? "border-primary/60 bg-primary/[0.07] shadow-xs"
                        : "border-border/70 bg-card hover:border-foreground/20 hover:bg-muted/40",
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden>{item.icon}</span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                        isSelected ? "border-primary bg-primary text-primary-foreground scale-100" : "border-border scale-90",
                      )}
                    >
                      {isSelected && <HugeiconsIcon icon={Check} strokeWidth={3} className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <Button variant="ghost" onClick={prevStep} className="flex-1 h-11 rounded-full font-medium">
                Back
              </Button>
              <Button
                onClick={nextStep}
                variant={useFor.length ? "default" : "outline"}
                className="flex-1 h-11 rounded-full font-medium shadow-xs"
              >
                {useFor.length ? "Continue" : "Skip"}
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

        {/* STEP 6: The Chrome extension (desktop Chromium without it only) */}
        {step === 6 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">Save from any page</h2>
              <p className="text-sm text-muted-foreground">
                Add Savedly to Chrome, and saving is one click from wherever you are.
              </p>
            </div>

            <div className="mx-auto max-w-md overflow-hidden rounded-2xl ring-1 ring-foreground/10 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- an animated WebP loop */}
              <img src="/whats-new/loops/extension.webp" alt="The Savedly extension saving a page" className="aspect-[16/9] w-full object-cover object-top" />
            </div>

            <ul className="mx-auto max-w-md space-y-2 text-sm text-foreground">
              {["Save the page you're on, with a note and tags", "Right-click to save a link, some text or an image", "Take a screenshot of an area or the whole view"].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <HugeiconsIcon icon={Check} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center gap-2.5 max-w-md mx-auto pt-2">
              {extensionStatus === "installed" ? (
                <p className="text-sm font-medium text-primary">It&apos;s installed. You&apos;re all set.</p>
              ) : (
                <a
                  href={CHROME_WEB_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setExtensionOpened(true)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                >
                  <ChromeLogo className="h-4 w-4 rounded-full ring-2 ring-white/90" />
                  Add to Chrome
                </a>
              )}
              {extensionOpened && (
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Once it&apos;s added, pin it from Chrome&apos;s puzzle-piece menu so it stays in the toolbar. It uses this sign-in.
                </p>
              )}
              <Button variant="ghost" onClick={nextStep} className="w-full h-11 rounded-full font-medium">
                {extensionOpened || extensionStatus === "installed" ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 7: Save a first memory (optional) */}
        {step === 7 && (
          <div className="w-full max-w-lg space-y-8 animate-fade-in my-auto">
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                Save your first thing
              </h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Anything you&apos;d be sorry to lose. Savedly gives it a title, a short summary and tags, and it&apos;s on your home page when you get there.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground text-center">Not sure? Pick one</p>
              <div className="flex flex-wrap justify-center gap-2">
                {firstSavePrompts.map((prompt, i) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => {
                      setFirstSavePrompt(i);
                      firstSaveBox.current?.focus();
                    }}
                    className={cn(
                      "h-9 rounded-full border px-4 text-[13px] font-medium transition-colors",
                      firstSavePrompt === i
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-4">
              <textarea
                ref={firstSaveBox}
                aria-label="What to save"
                placeholder={firstSavePrompt === null ? "Paste a link or write something" : firstSavePrompts[firstSavePrompt].hint}
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                }}
                rows={3}
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3.5 text-base leading-relaxed text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
              <p className="text-xs text-muted-foreground text-center">
                Nothing to hand?{" "}
                <button
                  type="button"
                  onClick={() => setCustomLink(`${window.location.origin}/help/docs/get-started/getting-started`)}
                  className="font-medium text-primary hover:underline"
                >
                  Save our getting-started guide
                </button>
              </p>
              {submitError && (
                <p className="text-xs text-destructive text-center">{submitError}</p>
              )}
              <Button
                type="submit"
                disabled={!customLink.trim() || completeOnboardingMutation.isPending}
                className="w-full h-11 rounded-full font-medium shadow-xs"
              >
                {completeOnboardingMutation.isPending ? "Saving…" : "Save it"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void finishOnboarding(false)}
                disabled={completeOnboardingMutation.isPending}
                className="w-full h-10 rounded-full font-medium text-muted-foreground"
              >
                Skip for now
              </Button>
            </form>
          </div>
        )}

        {/* STEP 8: Ready */}
        {step === 8 && (
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
                Summaries, auto-tags, and Ask need an AI key. Saving and keyword search work without one. If you run this install, the dashboard walks you through connecting it.
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
