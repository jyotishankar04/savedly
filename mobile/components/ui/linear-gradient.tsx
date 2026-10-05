import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";

// expo-linear-gradient isn't one of NativeWind's built-in cssInterop targets,
// so className is a no-op on the raw import — this wraps it so `className`
// maps to `style`, same as every other NativeWind-aware component.
export const LinearGradient = cssInterop(ExpoLinearGradient, { className: "style" });
