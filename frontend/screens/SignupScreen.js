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

import { AppInput, PrimaryButton, ScreenShell, SurfaceCard } from "../components/ui";
import { signupUser } from "../services/api";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

export default function SignupScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Add an email and password to create your account.");
      return;
    }

    setLoading(true);

    try {
      await signupUser(email.trim(), password);
      Alert.alert("Account created", "You can sign in now and start using the app.");
      navigation.replace("Login");
    } catch (err) {
      Alert.alert("Signup failed", err.message || "Unable to create the account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell scroll edges={["top", "bottom"]} contentContainerStyle={styles.screenContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.layout, isWide && styles.layoutWide]}
      >
        <SurfaceCard style={[styles.infoCard, isWide && styles.infoCardWide]}>
          <View style={styles.badge}>
            <Ionicons color={colors.primary} name="leaf-outline" size={20} />
            <Text style={styles.badgeText}>Your personal growth space</Text>
          </View>

          <Text style={styles.infoTitle}>Create an account built for momentum.</Text>
          <Text style={styles.infoSubtitle}>
            Track goals, build habits, and keep a conversation open with your AI coach
            without bouncing between separate tools.
          </Text>

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>1</Text>
              <Text style={styles.statLabel}>Unified dashboard</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>24/7</Text>
              <Text style={styles.statLabel}>Coach availability</Text>
            </View>
          </View>
        </SurfaceCard>

        <View style={[styles.formWrap, isWide && styles.formWrapWide]}>
          <Text style={styles.formTitle}>Create your account</Text>
          <Text style={styles.formSubtitle}>
            Keep it simple for now. You can start adding goals and habits right after sign up.
          </Text>

          <SurfaceCard style={styles.formCard}>
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
              placeholder="Choose a secure password"
              secureTextEntry
              value={password}
            />

            <PrimaryButton loading={loading} onPress={handleSignup} title="Create account" />
          </SurfaceCard>

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkAccent}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  layout: {
    flex: 1,
    gap: spacing.xl,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  layoutWide: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCard: {
    gap: spacing.lg,
    backgroundColor: "#fff8f1",
  },
  infoCardWide: {
    flex: 1,
    marginRight: spacing.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#e7f2ef",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.primaryDeep,
    fontFamily: appFonts.heading,
    fontSize: 13,
  },
  infoTitle: {
    color: colors.text,
    fontFamily: appFonts.display,
    fontSize: 36,
    lineHeight: 44,
  },
  infoSubtitle: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 16,
    lineHeight: 25,
  },
  statGrid: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  statCard: {
    minWidth: 130,
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  statValue: {
    color: colors.text,
    fontFamily: appFonts.display,
    fontSize: 30,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 13,
    marginTop: 4,
  },
  formWrap: {
    gap: spacing.md,
  },
  formWrapWide: {
    width: 430,
  },
  formTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 28,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  formCard: {
    gap: spacing.md,
  },
  loginLink: {
    paddingTop: spacing.xs,
  },
  loginLinkText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
    textAlign: "center",
  },
  loginLinkAccent: {
    color: colors.primary,
    fontFamily: appFonts.heading,
  },
});
