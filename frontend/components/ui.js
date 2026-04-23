import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

export function ScreenShell({
  children,
  scroll = false,
  contentContainerStyle,
  style,
  edges,
}) {
  const content = scroll ? (
    <ScrollView
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, style]}
      edges={edges || ["top", "left", "right"]}
    >
      <View style={styles.background}>
        <View style={styles.orbLarge} />
        <View style={styles.orbSmall} />
        <View style={styles.orbWarm} />
        {content}
      </View>
    </SafeAreaView>
  );
}

export function SurfaceCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ eyebrow, title, subtitle, action }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function AppInput({ label, helper, style, inputStyle, rightAdornment, ...props }) {
  return (
    <View style={[styles.inputWrap, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            rightAdornment && styles.inputWithAdornment,
            inputStyle,
          ]}
          {...props}
        />
        {rightAdornment ? <View style={styles.inputAdornment}>{rightAdornment}</View> : null}
      </View>
      {helper ? <Text style={styles.inputHelper}>{helper}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  const hasText = typeof title === "string" ? title.trim().length > 0 : Boolean(title);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.buttonSecondary,
        isGhost && styles.buttonGhost,
        pressed && !disabled && !loading && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isSecondary || isGhost ? colors.primary : colors.white}
        />
      ) : (
        <View style={[styles.buttonContent, !hasText && styles.buttonContentIconOnly]}>
          {icon}
          {hasText ? (
            <Text
              style={[
                styles.buttonText,
                (isSecondary || isGhost) && styles.buttonTextSecondary,
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function StatPill({ label, value, tone = "primary", style }) {
  const toneStyle =
    tone === "warm" ? styles.pillWarm : tone === "success" ? styles.pillSuccess : styles.pillPrimary;

  return (
    <View style={[styles.pill, toneStyle, style]}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function Chip({ title, onPress, style, textStyle }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.chipText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  orbLarge: {
    position: "absolute",
    top: -120,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#f2d9b9",
    opacity: 0.75,
  },
  orbSmall: {
    position: "absolute",
    top: 140,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#d7ece7",
    opacity: 0.65,
  },
  orbWarm: {
    position: "absolute",
    bottom: 120,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3c996",
    opacity: 0.35,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.secondary,
    fontFamily: appFonts.heading,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 24,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  inputWrap: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 14,
  },
  inputHelper: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 12,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 15,
  },
  inputRow: {
    position: "relative",
    justifyContent: "center",
  },
  inputWithAdornment: {
    paddingRight: 84,
  },
  inputAdornment: {
    position: "absolute",
    right: spacing.md,
    alignSelf: "center",
  },
  button: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    ...shadows.soft,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonContentIconOnly: {
    gap: 0,
  },
  buttonText: {
    color: colors.white,
    fontFamily: appFonts.heading,
    fontSize: 15,
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  pill: {
    minWidth: 96,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  pillPrimary: {
    backgroundColor: "#dff1ee",
  },
  pillWarm: {
    backgroundColor: "#f7ead0",
  },
  pillSuccess: {
    backgroundColor: "#deefe7",
  },
  pillValue: {
    color: colors.text,
    fontFamily: appFonts.display,
    fontSize: 22,
  },
  pillLabel: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 12,
  },
  emptyState: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 18,
  },
  emptyMessage: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  chipText: {
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 13,
  },
});
