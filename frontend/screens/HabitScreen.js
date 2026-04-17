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
import * as Haptics from "expo-haptics";

import {
  AppInput,
  EmptyState,
  PrimaryButton,
  ScreenShell,
  SectionTitle,
  StatPill,
  SurfaceCard,
} from "../components/ui";
import { createHabit, getHabits, getHabitStreak, logHabit } from "../services/api";
import { getToken } from "../utils/auth";
import { appFonts, colors, radius, spacing } from "../theme";

export default function HabitsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [habit, setHabit] = useState("");
  const [habits, setHabits] = useState([]);
  const [token, setToken] = useState("");
  const [streaks, setStreaks] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeHabitId, setActiveHabitId] = useState(null);

  const loadHabits = useCallback(async () => {
    setLoading(true);

    try {
      const storedToken = await getToken();
      setToken(storedToken || "");

      const data = storedToken ? await getHabits(storedToken) : [];
      const safeHabits = Array.isArray(data) ? data : [];
      setHabits(safeHabits);

      const streakEntries = await Promise.all(
        safeHabits.map(async (item) => [
          item.id,
          storedToken ? await getHabitStreak(item.id, storedToken) : 0,
        ])
      );

      setStreaks(Object.fromEntries(streakEntries));
    } catch (err) {
      Alert.alert("Unable to load habits", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  const handleAddHabit = async () => {
    if (!habit.trim()) {
      return;
    }

    try {
      setCreating(true);
      await createHabit(habit.trim(), token);
      setHabit("");
      await loadHabits();
    } catch (err) {
      Alert.alert("Habit not added", err.message || "Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleLog = async (id, status) => {
    try {
      setActiveHabitId(id);
      await Haptics.selectionAsync();
      await logHabit(id, status, token);
      Alert.alert(
        status ? "Habit completed" : "Habit skipped",
        status
          ? "Nice work. Your habit log has been updated."
          : "Logged as skipped. You can reset and keep the streak alive tomorrow."
      );
      await loadHabits();
    } catch (err) {
      Alert.alert("Unable to update habit", err.message || "Please try again.");
    } finally {
      setActiveHabitId(null);
    }
  };

  const bestStreak = habits.length
    ? Math.max(...habits.map((item) => streaks[item.id] || 0))
    : 0;

  return (
    <ScreenShell scroll contentContainerStyle={styles.screenContent} edges={["top", "bottom"]}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>Habit System</Text>
        <Text style={styles.title}>Build routines that are easy to maintain.</Text>
        <Text style={styles.subtitle}>
          Track small repeats, celebrate streaks, and keep the habit loop simple enough
          to survive busy days.
        </Text>
      </View>

      <SurfaceCard style={styles.summaryCard}>
        <View style={[styles.summaryContent, isWide && styles.summaryContentWide]}>
          <SectionTitle
            eyebrow="Consistency"
            subtitle="Daily logging gives the coach more context for better guidance."
            title="Small actions add up faster than big resets."
          />

          <View style={styles.summaryStats}>
            <StatPill label="Active habits" value={habits.length} />
            <StatPill label="Top streak" tone="warm" value={bestStreak} />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.addCard}>
        <SectionTitle
          eyebrow="Add Habit"
          subtitle="Make it obvious and repeatable."
          title="What should become automatic?"
        />

        <View style={[styles.addRow, isWide && styles.addRowWide]}>
          <AppInput
            label="Habit name"
            onChangeText={setHabit}
            placeholder="For example: Stretch for 10 minutes"
            style={styles.habitInput}
            value={habit}
          />
          <PrimaryButton
            loading={creating}
            onPress={handleAddHabit}
            style={styles.addButton}
            title="Add habit"
          />
        </View>
      </SurfaceCard>

      {loading ? (
        <SurfaceCard style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading habits and streaks...</Text>
        </SurfaceCard>
      ) : habits.length ? (
        <View style={[styles.grid, isWide && styles.gridWide]}>
          {habits.map((item) => {
            const streak = streaks[item.id] || 0;
            const isActive = activeHabitId === item.id;

            return (
              <SurfaceCard key={item.id} style={[styles.habitCard, isWide && styles.habitCardWide]}>
                <View style={styles.habitHeader}>
                  <View style={styles.habitIcon}>
                    <Ionicons color={colors.primary} name="leaf-outline" size={20} />
                  </View>
                  <View style={styles.habitCopy}>
                    <Text style={styles.habitTitle}>{item.name}</Text>
                    <Text style={styles.habitSubtitle}>Stay visible. Stay repeatable.</Text>
                  </View>
                </View>

                <View style={styles.streakBadge}>
                  <Text style={styles.streakValue}>{streak}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>

                <View style={styles.logRow}>
                  <PrimaryButton
                    loading={isActive}
                    onPress={() => handleLog(item.id, true)}
                    style={styles.logButton}
                    title="Done today"
                  />
                  <PrimaryButton
                    onPress={() => handleLog(item.id, false)}
                    style={styles.skipButton}
                    textStyle={styles.skipButtonText}
                    title="Skip"
                    variant="secondary"
                  />
                </View>
              </SurfaceCard>
            );
          })}
        </View>
      ) : (
        <SurfaceCard>
          <EmptyState
            message="Create one habit you can realistically keep for a week. Consistency beats ambition here."
            title="No habits yet"
          />
        </SurfaceCard>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
    paddingBottom: 108,
  },
  headerCopy: {
    gap: 4,
    marginTop: spacing.sm,
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
    maxWidth: 650,
  },
  summaryCard: {
    backgroundColor: "#f3f8f6",
  },
  summaryContent: {
    gap: spacing.lg,
  },
  summaryContentWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryStats: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  addCard: {
    gap: spacing.md,
  },
  addRow: {
    gap: spacing.md,
  },
  addRowWide: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  habitInput: {
    flex: 1,
  },
  addButton: {
    minWidth: 150,
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
  },
  grid: {
    gap: spacing.lg,
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  habitCard: {
    gap: spacing.md,
  },
  habitCardWide: {
    width: "48%",
  },
  habitHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e6f3f0",
    alignItems: "center",
    justifyContent: "center",
  },
  habitCopy: {
    flex: 1,
    gap: 2,
  },
  habitTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 18,
  },
  habitSubtitle: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 13,
  },
  streakBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "#fff2d9",
  },
  streakValue: {
    color: colors.text,
    fontFamily: appFonts.display,
    fontSize: 24,
  },
  streakLabel: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 12,
  },
  logRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  logButton: {
    flex: 1,
    minWidth: 130,
  },
  skipButton: {
    minWidth: 100,
  },
  skipButtonText: {
    color: colors.primary,
  },
});
