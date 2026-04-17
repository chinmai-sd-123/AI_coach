import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import {
  AppInput,
  Chip,
  EmptyState,
  PrimaryButton,
  ScreenShell,
  SectionTitle,
  StatPill,
  SurfaceCard,
} from "../components/ui";
import { createGoal, getGoals } from "../services/api";
import { getToken } from "../utils/auth";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

const quickGoalIdeas = [
  "Read for 20 minutes",
  "Walk 8,000 steps",
  "Journal before bed",
];

export default function HomeScreen({ navigation, onLogout }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [goal, setGoal] = useState("");
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState("");

  const loadData = useCallback(async (showRefresh = false) => {
    if (!showRefresh) {
      setLoading(true);
    }

    try {
      const storedToken = await getToken();
      setToken(storedToken || "");

      const data = storedToken ? await getGoals(storedToken) : [];
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert("Unable to load goals", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddGoal = async () => {
    if (!goal.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await createGoal(goal.trim(), token);
      setGoal("");
      await loadData(true);
    } catch (err) {
      Alert.alert("Goal not added", err.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickGoal = (idea) => {
    setGoal(idea);
  };

  return (
    <ScreenShell
      scroll
      contentContainerStyle={styles.screenContent}
      edges={["top", "bottom"]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Daily Focus</Text>
          <Text style={styles.title}>Your coaching dashboard</Text>
          <Text style={styles.subtitle}>
            Keep your goals visible, your next action clear, and your momentum steady.
          </Text>
        </View>

        <PrimaryButton
          icon={<Ionicons color={colors.primary} name="log-out-outline" size={18} />}
          onPress={onLogout}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
          title="Log out"
          variant="secondary"
        />
      </View>

      <SurfaceCard style={styles.heroCard}>
        <View style={[styles.heroContent, isWide && styles.heroContentWide]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Plan the next habit or goal that matters.</Text>
            <Text style={styles.heroText}>
              A focused list is easier to act on. Add one meaningful goal and let the rest
              of the app help you follow through.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <StatPill label="Active goals" tone="primary" value={goals.length} />
            <StatPill label="Coach access" tone="warm" value="24/7" />
            <StatPill label="Best next step" tone="success" value="1" />
          </View>
        </View>
      </SurfaceCard>

      <View style={[styles.contentGrid, isWide && styles.contentGridWide]}>
        <SurfaceCard style={styles.composeCard}>
          <SectionTitle
            eyebrow="Add Goal"
            subtitle="Keep it concrete and small enough to start today."
            title="What are you working on next?"
          />

          <AppInput
            label="Goal title"
            onChangeText={setGoal}
            placeholder="For example: Finish my portfolio case study"
            value={goal}
          />

          <View style={styles.chipRow}>
            {quickGoalIdeas.map((idea) => (
              <Chip key={idea} onPress={() => handleQuickGoal(idea)} title={idea} />
            ))}
          </View>

          <PrimaryButton
            loading={submitting}
            onPress={handleAddGoal}
            title="Add to dashboard"
          />

          <View style={styles.shortcutRow}>
            <PressableCard
              icon="repeat-outline"
              label="Build habits"
              onPress={() => navigation.navigate("Habits")}
            />
            <PressableCard
              icon="chatbubble-ellipses-outline"
              label="Ask the coach"
              onPress={() => navigation.navigate("Coach")}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.listCard}>
          <SectionTitle
            eyebrow="Visible Progress"
            subtitle="These are the goals currently shaping your week."
            title="Current goals"
          />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading your goals...</Text>
            </View>
          ) : goals.length ? (
            <View style={styles.goalList}>
              {goals.map((item, index) => (
                <View key={item.id} style={styles.goalItem}>
                  <View style={styles.goalIndex}>
                    <Text style={styles.goalIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.goalCopy}>
                    <Text style={styles.goalTitle}>{item.title}</Text>
                    <Text style={styles.goalMeta}>Stay visible and keep it moving.</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              message="Add your first goal to give the dashboard something actionable to center around."
              title="No goals yet"
            />
          )}
        </SurfaceCard>
      </View>

      <View style={styles.tipCard}>
        <Ionicons color={colors.secondary} name="sparkles-outline" size={18} />
        <Text style={styles.tipText}>
          Best results come from fewer active goals with clearer next steps.
        </Text>
      </View>
    </ScreenShell>
  );
}

function PressableCard({ icon, label, onPress }) {
  return (
    <View style={styles.shortcutCardWrap}>
      <PrimaryButton
        icon={<Ionicons color={colors.primary} name={icon} size={18} />}
        onPress={onPress}
        style={styles.shortcutCard}
        textStyle={styles.shortcutCardText}
        title={label}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.secondary,
    fontFamily: appFonts.heading,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontFamily: appFonts.display,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 2,
    maxWidth: 580,
  },
  logoutButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: colors.primary,
  },
  heroCard: {
    backgroundColor: "#fff6ec",
  },
  heroContent: {
    gap: spacing.lg,
  },
  heroContentWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
    maxWidth: 580,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  heroText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  contentGrid: {
    gap: spacing.lg,
  },
  contentGridWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  composeCard: {
    gap: spacing.md,
    flex: 1,
  },
  listCard: {
    gap: spacing.md,
    flex: 1.1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  shortcutRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  shortcutCardWrap: {
    flex: 1,
    minWidth: 160,
  },
  shortcutCard: {
    minHeight: 50,
    justifyContent: "center",
  },
  shortcutCardText: {
    color: colors.primary,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
  },
  goalList: {
    gap: spacing.sm,
  },
  goalItem: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  goalIndex: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  goalIndexText: {
    color: colors.primary,
    fontFamily: appFonts.heading,
    fontSize: 15,
  },
  goalCopy: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 16,
  },
  goalMeta: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 13,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "#fcead8",
    alignSelf: "flex-start",
    marginBottom: 96,
  },
  tipText: {
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 13,
  },
});
