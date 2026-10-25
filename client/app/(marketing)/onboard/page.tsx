"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getServerConfig } from "@/lib/server-config";
import { completeOnboarding } from "@/lib/user";
import { useCurrentUserQuery, useSetCurrentUser } from "@/context/UserContext";
import { useCreateMemoryMutation } from "@/context/MemoryContext";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { Logo } from "@/components/logo";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { interests } from "@/components/onboarding/onboarding-data";
import { StepName } from "@/components/onboarding/step-name";
import { StepInterests } from "@/components/onboarding/step-interests";
import { StepOrganize } from "@/components/onboarding/step-organize";
import { StepWaysToSave } from "@/components/onboarding/step-ways-to-save";
import { StepExtension } from "@/components/onboarding/step-extension";
import { StepFirstSave } from "@/components/onboarding/step-first-save";
import { StepReady } from "@/components/onboarding/step-ready";

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
  const [preview, setPreview] = useState<number | null>(null);
  const [firstSavePrompt, setFirstSavePrompt] = useState<number | null>(null);
  
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
        
        {step === 1 && <StepName name={name} setName={setName} onContinue={nextStep} />}

        {step === 2 && <StepInterests useFor={useFor} setUseFor={setUseFor} onBack={prevStep} onContinue={nextStep} />}

        {step === 4 && <StepOrganize orgMode={orgMode} setOrgMode={setOrgMode} selfHosted={selfHosted} onBack={prevStep} onContinue={nextStep} />}

        {step === 5 && <StepWaysToSave preview={preview} setPreview={setPreview} onContinue={nextStep} />}

        {step === 6 && (
          <StepExtension extensionStatus={extensionStatus} extensionOpened={extensionOpened} setExtensionOpened={setExtensionOpened} onContinue={nextStep} />
        )}

        {step === 7 && (
          <StepFirstSave
            customLink={customLink}
            setCustomLink={setCustomLink}
            firstSavePrompt={firstSavePrompt}
            setFirstSavePrompt={setFirstSavePrompt}
            submitError={submitError}
            isPending={completeOnboardingMutation.isPending}
            onSubmit={handleSaveMemory}
            onSkip={() => void finishOnboarding(false)}
          />
        )}

        {step === 8 && <StepReady selfHosted={selfHosted} onEnter={() => router.push(nextDestination)} />}

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
