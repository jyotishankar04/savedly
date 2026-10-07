"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  getAuthProviders,
  getProviderLoginUrl,
  loginWithPassword,
  registerWithPassword,
  type AuthUser,
} from "@/lib/auth";

const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const GithubIcon = () => (
  <svg className="h-4 w-4 mr-2 fill-foreground text-foreground shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
  </svg>
);

const providerButton =
  "w-full flex items-center justify-center border border-input bg-background hover:bg-muted text-foreground text-sm font-medium py-3 rounded-xl transition-all cursor-pointer";
const fieldInput = "h-11 rounded-xl px-3.5 text-sm md:text-sm";

type Mode = "login" | "signup";

/**
 * Sign in / sign up, showing only the methods this server offers. On a fresh
 * self-hosted install (no accounts yet) it becomes "Create your admin account",
 * whichever page it's on.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { data: providers, isLoading } = useQuery({ queryKey: ["auth", "providers"], queryFn: getAuthProviders });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setup = !!providers?.needsSetup;
  const creating = mode === "signup" || setup;
  const oauth = !setup && (providers?.google || providers?.github);

  const title = setup ? "Create your admin account" : creating ? "Create an account" : "Sign in";
  const subtitle = setup
    ? "You're the first person here, so this account will run this Savedly install."
    : creating
      ? "Start your personal memory for the internet."
      : "Welcome back.";

  const finish = (user: AuthUser) => router.replace(user.onboardingCompleted ? "/app" : "/onboard");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      finish(creating ? await registerWithPassword(name, email, password) : await loginWithPassword(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  const nothingAvailable = !providers?.password && !providers?.google && !providers?.github;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {nothingAvailable && (
        <p className="text-sm text-muted-foreground">Sign-in isn&apos;t available right now. Please try again later.</p>
      )}

      {oauth && (
        <div className="space-y-3">
          {providers?.google && (
            <button type="button" onClick={() => window.location.assign(getProviderLoginUrl("google"))} className={providerButton}>
              <GoogleIcon />
              Continue with Google
            </button>
          )}
          {providers?.github && (
            <button type="button" onClick={() => window.location.assign(getProviderLoginUrl("github"))} className={providerButton}>
              <GithubIcon />
              Continue with GitHub
            </button>
          )}
        </div>
      )}

      {oauth && providers?.password && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or with email
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      {providers?.password && (
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          {creating && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">Name</span>
              <Input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Email</span>
            <Input
              className={fieldInput}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Password</span>
            <Input
              className={fieldInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={creating ? "new-password" : "current-password"}
              minLength={creating ? 8 : undefined}
              required
            />
            {creating && <span className="block text-[11px] text-muted-foreground">At least 8 characters.</span>}
          </label>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium py-3 rounded-xl transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {setup ? "Create admin account" : creating ? "Create account" : "Sign in"}
          </button>
        </form>
      )}

      {!setup && (
        <p className="text-center text-xs text-muted-foreground">
          {creating ? "Already have an account? " : "Don't have an account? "}
          <Link href={creating ? "/auth/login" : "/auth/signup"} className="text-primary hover:underline font-semibold">
            {creating ? "Sign in" : "Sign up"}
          </Link>
        </p>
      )}
    </div>
  );
}
