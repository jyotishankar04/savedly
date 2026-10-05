import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { getProviderLoginUrl, getProviders, type OAuthProvider, type ProvidersResponse } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

// Registering this lets openAuthSessionAsync close the in-app browser as
// soon as the server's deep-link redirect fires, instead of leaving it open.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProviders()
      .then(setProviders)
      .catch(() => setError("Couldn't reach the server. Please check your connection."));
  }, []);

  const handleSignIn = async (provider: OAuthProvider) => {
    setError(null);
    setPendingProvider(provider);
    try {
      const redirectUrl = Linking.createURL("auth");
      const result = await WebBrowser.openAuthSessionAsync(getProviderLoginUrl(provider), redirectUrl);

      if (result.type !== "success" || !result.url) {
        if (result.type !== "cancel" && result.type !== "dismiss") {
          setError("Sign-in didn't complete. Please try again.");
        }
        return;
      }

      const { queryParams } = Linking.parse(result.url);
      const accessToken = queryParams?.accessToken;
      const refreshToken = queryParams?.refreshToken;
      const oauthError = queryParams?.error;

      if (oauthError) {
        setError("Sign-in failed. Please try again.");
        return;
      }
      if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
        setError("Sign-in didn't return valid credentials. Please try again.");
        return;
      }

      await signIn(accessToken, refreshToken);
      const onboardingCompleted = queryParams?.onboardingCompleted === "true";
      router.replace(onboardingCompleted ? "/(tabs)" : "/auth/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
      <Text className="text-[32px] font-bold">Memora</Text>
      <Text className="mb-6 text-sm text-muted-foreground">Save it now, find it later.</Text>

      {!providers ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <View className="w-full gap-3">
          {providers.google && (
            <Button size="lg" className="rounded-full" disabled={pendingProvider !== null} onPress={() => handleSignIn("google")}>
              <Text className="font-semibold">{pendingProvider === "google" ? "Signing in..." : "Continue with Google"}</Text>
            </Button>
          )}
          {providers.github && (
            <Button size="lg" className="rounded-full" disabled={pendingProvider !== null} onPress={() => handleSignIn("github")}>
              <Text className="font-semibold">{pendingProvider === "github" ? "Signing in..." : "Continue with GitHub"}</Text>
            </Button>
          )}
        </View>
      )}

      {error && <Text className="mt-4 text-center text-sm text-destructive">{error}</Text>}
    </View>
  );
}
