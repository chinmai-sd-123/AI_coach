import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenShell, AppInput, PrimaryButton, SurfaceCard } from "../components/ui";
import { loginUser } from "../services/api";
import { saveToken } from "../utils/auth";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

const featurePoints = [
  "AI coaching conversations that stay focused on your goals.",
  "Habit tracking with quick daily check-ins and streak feedback.",
  "A calm dashboard designed for consistency, not clutter.",
];

export default function LoginScreen({ navigation, onAuthenticated }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Enter both your email and password to continue.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email.trim(), password);

      if (!data.access_token) {
        throw new Error(data.detail || "Invalid login response");
      }

      await saveToken(data.access_token);
      onAuthenticated?.();
    } catch (error) {
      Alert.alert("Login failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? spacing.md : 0}
      style={styles.keyboardAvoidingView}
    >
      <ScreenShell scroll edges={["top", "bottom"]} contentContainerStyle={styles.screenContent}>
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={[styles.heroBlock, isWide && styles.heroBlockWide]}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons color={colors.white} name="sparkles" size={22} />
              </View>
              <Text style={styles.brandText}>AI Life Coach</Text>
            </View>

            <Text style={styles.heroTitle}>Build a steadier routine with a calmer, smarter coach.</Text>
            <Text style={styles.heroSubtitle}>
              Daily planning, habits, and coaching all live in one focused space designed
              to help you follow through.
            </Text>

            <View style={styles.featureList}>
              {featurePoints.map((item) => (
                <View key={item} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <SurfaceCard style={[styles.formCard, isWide && styles.formCardWide]}>
            <Text style={styles.formEyebrow}>Welcome back</Text>
            <Text style={styles.formTitle}>Sign in to your account</Text>

            <AppInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              value={email}
            />

            <AppInput
              label="Password"
              onChangeText={setPassword}
              placeholder="Enter your password"
              rightAdornment={
                <Pressable
                  hitSlop={10}
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.passwordToggle}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              }
              secureTextEntry={!showPassword}
              value={password}
            />

            <PrimaryButton loading={loading} onPress={handleLogin} title="Continue to dashboard" />

            <Pressable onPress={() => navigation.navigate("Signup")} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>
                New here? <Text style={styles.footerLinkAccent}>Create your account</Text>
              </Text>
            </Pressable>
          </SurfaceCard>
        </View>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  layout: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.xl,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    paddingVertical: spacing.xl,
  },
  layoutWide: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroBlock: {
    gap: spacing.lg,
  },
  heroBlockWide: {
    flex: 1,
    paddingRight: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  brandText: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 18,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: appFonts.display,
    fontSize: 40,
    lineHeight: 48,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 520,
  },
  featureList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  featureText: {
    flex: 1,
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  formCard: {
    gap: spacing.md,
  },
  formCardWide: {
    width: 430,
  },
  formEyebrow: {
    color: colors.secondary,
    fontFamily: appFonts.heading,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  formTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 28,
  },
  footerLink: {
    paddingTop: spacing.xs,
  },
  passwordToggle: {
    paddingVertical: 4,
  },
  passwordToggleText: {
    color: colors.primary,
    fontFamily: appFonts.heading,
    fontSize: 13,
  },
  footerLinkText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
    textAlign: "center",
  },
  footerLinkAccent: {
    color: colors.primary,
    fontFamily: appFonts.heading,
  },
});
