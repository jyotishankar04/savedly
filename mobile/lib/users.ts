import { apiFetch } from "./api";
import { type AuthUser } from "./auth";

export interface UpdateProfileInput {
  name: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>("/users/me", {
    method: "PATCH",
    body: input,
  });
  return user;
}

export interface CompleteOnboardingInput {
  name: string;
  interests: string[];
  contentTypes: string[];
  organizeMode: "auto" | "manual";
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>("/users/me/onboarding", {
    method: "POST",
    body: input,
  });
  return user;
}
