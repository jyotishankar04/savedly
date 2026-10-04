import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles, Palette, GraduationCap, Lightbulb, Microscope, Video, SlidersHorizontal, Check } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { completeOnboarding } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

const interests = [
  { id: "inspiration", label: "Inspiration", desc: "Websites, designs & ideas", icon: Palette },
  { id: "learning", label: "Learning", desc: "Tutorials, courses & resources", icon: GraduationCap },
  { id: "ideas", label: "Ideas", desc: "Things you want to build", icon: Lightbulb },
  { id: "research", label: "Research", desc: "Articles, papers & references", icon: Microscope },
  { id: "content", label: "Content", desc: "Videos, reels & posts", icon: Video },
];

const saveTypes = [
  "Websites", "Videos", "Articles", "Screenshots", "GitHub repos", 
  "Social posts", "Notes", "Ideas", "Products", "Books", "Courses", "Tools"
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { refetch } = useAuth();
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";
  const primaryColor = THEME[resolved].primary;
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [useFor, setUseFor] = useState<string[]>([]);
  const [saveMost, setSaveMost] = useState<string[]>([]);
  const [orgMode, setOrgMode] = useState<"auto" | "manual">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => setStep((p) => Math.min(p + 1, 5));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({
        name: name.trim() || "User",
        interests: useFor,
        contentTypes: saveMost,
        organizeMode: orgMode,
      });
      await refetch();
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences.");
      setIsSubmitting(false);
    }
  };

  const progress = (step / 5) * 100;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      className="flex-1 bg-background"
    >
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-border/20 mt-12">
        <Text className="text-xl font-bold tracking-tight">Memora</Text>
        <Text className="text-xs font-mono text-muted-foreground font-semibold">
          STEP 0{step} / 05
        </Text>
      </View>
      <View className="h-1 bg-muted w-full">
        <View className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-6 pb-20 flex-grow justify-center">
        {step === 1 && (
          <View className="gap-6 animate-fade-in">
            <View className="gap-2">
              <View className="bg-muted self-start px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Welcome to Memora
                </Text>
              </View>
              <Text className="text-3xl font-bold text-foreground">What's your name?</Text>
            </View>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              className="h-16 text-2xl font-semibold bg-transparent border-0 border-b-2 border-border/20 rounded-none focus:border-primary px-0 focus-visible:ring-0"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={nextStep}
            />
            <Button
              onPress={nextStep}
              disabled={!name.trim()}
              className="h-14 rounded-full mt-4"
            >
              <Text className="text-lg font-semibold">Continue</Text>
            </Button>
          </View>
        )}

        {step === 2 && (
          <View className="gap-6 animate-fade-in">
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">What will you use Memora for?</Text>
              <Text className="text-base text-muted-foreground">Choose what you want Memora to help you remember.</Text>
            </View>
            <View className="gap-3">
              {interests.map((item) => {
                const isSelected = useFor.includes(item.id);
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setUseFor((prev) => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                    className={cn(
                      "p-4 rounded-xl border flex-row items-center justify-between",
                      isSelected ? "border-primary bg-muted" : "border-border bg-card"
                    )}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className={cn("p-2 rounded-lg", isSelected ? "bg-muted" : "bg-muted")}>
                        <Icon size={24} color={isSelected ? primaryColor : THEME[resolved].mutedForeground} />
                      </View>
                      <View>
                        <Text className="font-semibold text-foreground text-base">{item.label}</Text>
                        <Text className="text-sm text-muted-foreground">{item.desc}</Text>
                      </View>
                    </View>
                    <View className={cn(
                      "h-6 w-6 rounded-full border items-center justify-center",
                      isSelected ? "border-primary bg-primary" : "border-border"
                    )}>
                      {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="flex-row gap-3 mt-4">
              <Button variant="outline" onPress={prevStep} className="flex-1 h-14 rounded-full">
                <Text className="text-lg font-semibold">Back</Text>
              </Button>
              <Button onPress={nextStep} className="flex-1 h-14 rounded-full">
                <Text className="text-lg font-semibold">Continue</Text>
              </Button>
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="gap-6 animate-fade-in">
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">What do you save most?</Text>
              <Text className="text-base text-muted-foreground">Pick a few things you never want to lose.</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {saveTypes.map((type) => {
                const isSelected = saveMost.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSaveMost((prev) => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                    className={cn(
                      "px-4 py-3 rounded-full border",
                      isSelected ? "border-primary bg-primary" : "border-border bg-card"
                    )}
                  >
                    <Text className={cn(
                      "font-semibold",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="flex-row gap-3 mt-4">
              <Button variant="outline" onPress={prevStep} className="flex-1 h-14 rounded-full">
                <Text className="text-lg font-semibold">Back</Text>
              </Button>
              <Button onPress={nextStep} className="flex-1 h-14 rounded-full">
                <Text className="text-lg font-semibold">Continue</Text>
              </Button>
            </View>
          </View>
        )}

        {step === 4 && (
          <View className="gap-6 animate-fade-in">
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">How should Memora organize?</Text>
              <Text className="text-base text-muted-foreground">Memora can understand what you save and organize it automatically.</Text>
            </View>
            <View className="gap-4">
              <TouchableOpacity
                onPress={() => setOrgMode("auto")}
                className={cn(
                  "p-5 rounded-2xl border",
                  orgMode === "auto" ? "border-primary bg-muted" : "border-border bg-card"
                )}
              >
                <View className="flex-row gap-4">
                  <View className="p-2 rounded-xl bg-muted">
                    <Sparkles size={24} color={primaryColor} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-lg font-bold text-foreground">Automatically</Text>
                      <View className="bg-emerald-500/10 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-emerald-600 font-bold uppercase">Recommended</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted-foreground leading-5">
                      Let Memora understand and organize everything for you. No tags or folders to maintain.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOrgMode("manual")}
                className={cn(
                  "p-5 rounded-2xl border",
                  orgMode === "manual" ? "border-primary bg-muted" : "border-border bg-card"
                )}
              >
                <View className="flex-row gap-4">
                  <View className="p-2 rounded-xl bg-muted">
                    <SlidersHorizontal size={24} color={THEME[resolved].mutedForeground} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground mb-1">My way</Text>
                    <Text className="text-sm text-muted-foreground leading-5">
                      I'll organize things myself. I prefer manual folder hierarchies and tags.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-3 mt-4">
              <Button variant="outline" onPress={prevStep} className="flex-1 h-14 rounded-full">
                <Text className="text-lg font-semibold">Back</Text>
              </Button>
              <Button onPress={nextStep} className="flex-1 h-14 rounded-full">
                <Text className="text-lg font-semibold">Continue</Text>
              </Button>
            </View>
          </View>
        )}

        {step === 5 && (
          <View className="gap-8 items-center justify-center py-10 animate-fade-in">
            <View className="h-24 w-24 rounded-full bg-muted items-center justify-center">
              <View className="h-16 w-16 rounded-full bg-primary items-center justify-center shadow-lg">
                <Sparkles size={32} color="#fff" />
              </View>
            </View>
            <View className="gap-3 items-center">
              <Text className="text-4xl font-bold text-center text-foreground">You're all set.</Text>
              <Text className="text-lg text-center text-muted-foreground">
                Save anything.{"\n"}Find everything.{"\n"}
                <Text className="font-semibold text-foreground">Never lose a good idea again.</Text>
              </Text>
            </View>
            {error && <Text className="text-destructive text-center">{error}</Text>}
            <Button
              onPress={handleComplete}
              disabled={isSubmitting}
              className="w-full h-14 rounded-full mt-4"
            >
              <Text className="text-lg font-semibold">{isSubmitting ? "Saving..." : "Enter Memora"}</Text>
            </Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
