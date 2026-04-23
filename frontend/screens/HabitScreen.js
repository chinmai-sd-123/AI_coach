// screens/HabitsScreen.jsx

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import {
  createHabit,
  getHabits,
  getHabitStreak,
  logHabit,
  getHabitLog,
} from "../services/api";
import { getToken } from "../utils/auth";
import { appFonts, colors, radius, spacing } from "../theme";

// ─────────────────────────────────────────────
// Helpers — defined outside component so they
// are never recreated on re-render
// ─────────────────────────────────────────────

// ✅ Fix 3: computed once per render cycle via useMemo in component,
//    but the pure function itself lives outside
function buildLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// ✅ Fix 2: defined at module level — no hoisting dependency on loadHabits
async function fetchAllLogs(habits, token) {
  // ✅ Fix 1: parallel fetches — all habits fetched simultaneously
  const results = await Promise.all(
    habits.map((h) => getHabitLog(h.id, token))
  );

  return habits.reduce((map, habit, i) => {
    map[habit.id] = {};
    results[i].forEach((log) => {
      map[habit.id][log.date] = log.status;
    });
    return map;
  }, {});
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function HabitsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;

  const [habit,        setHabit]        = useState("");
  // ✅ Fix 8: use [] not null — render safely checks .length without crashing
  //    use a ref to track whether we've fetched at all (the cache sentinel)
  const [habits,       setHabits]       = useState([]);
  const [token,        setToken]        = useState("");
  const [streaks,      setStreaks]       = useState({});
  const [logs,         setLogs]         = useState({});
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [activeHabitId, setActiveHabitId] = useState(null);

  // ✅ Cache sentinel — true once we've successfully loaded data at least once
  //    useFocusEffect runs on every screen focus; this prevents redundant refetches
  const hasFetchedRef = useRef(false);

  // ✅ Fix 3: last 7 days computed once per day, not per-habit per-render
  const last7Days = useMemo(() => buildLast7Days(), []);

  // ── Load all data ─────────────────────────────
  const loadHabits = useCallback(async (force = false) => {
    // ✅ Cache check: skip fetch if data is already loaded
    //    Pass force=true to bypass (e.g. after creating a new habit)
    if (hasFetchedRef.current && !force) return;

    setLoading(true);
    try {
      const storedToken = await getToken();
      setToken(storedToken || "");

      const data       = storedToken ? await getHabits(storedToken) : [];
      const safeHabits = Array.isArray(data) ? data : [];
      setHabits(safeHabits);

      if (storedToken && safeHabits.length) {
        // ✅ Fix 1+2: parallel log + streak fetches via Promise.all
        const [logMap, streakEntries] = await Promise.all([
          fetchAllLogs(safeHabits, storedToken),
          Promise.all(
            safeHabits.map(async (h) => [
              h.id,
              await getHabitStreak(h.id, storedToken),
            ])
          ),
        ]);

        setLogs(logMap);
        setStreaks(Object.fromEntries(streakEntries));
      }

      hasFetchedRef.current = true; // ✅ mark cache as populated
    } catch (err) {
      Alert.alert("Unable to load habits", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Cache: only fetches on first focus — subsequent focuses are instant
  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  // ── Add habit ─────────────────────────────────
  const handleAddHabit = async () => {
    if (!habit.trim()) return;

    try {
      setCreating(true);
      await createHabit(habit.trim(), token);
      setHabit("");
      // ✅ force=true: new habit must invalidate and refresh the cache
      await loadHabits(true);
    } catch (err) {
      Alert.alert("Habit not added", err.message || "Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // ── Log a habit day ───────────────────────────
  const handleLog = async (habitId, currentStatus, date) => {
  const newStatus = !currentStatus;

  Haptics.impactAsync(
    newStatus
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light
  );

  // Optimistic update
  setLogs((prev) => ({
    ...prev,
    [habitId]: { ...prev[habitId], [date]: newStatus },
  }));

  try {
    setActiveHabitId(habitId);

    // ✅ Always read fresh token — state may be stale
    const freshToken = await getToken();
    console.log("token:", freshToken);
console.log("params:", habitId, newStatus, date);
    if (!freshToken) throw new Error("Invalid token");

    await logHabit(habitId, newStatus, freshToken);

    const updatedStreak = await getHabitStreak(habitId, freshToken);
    setStreaks((prev) => ({ ...prev, [habitId]: updatedStreak }));

  } catch (err) {
    // Rollback
    setLogs((prev) => ({
      ...prev,
      [habitId]: { ...prev[habitId], [date]: currentStatus },
    }));
    Alert.alert("Couldn't save log", err.message || "Please try again.");
  } finally {
    setActiveHabitId(null);
  }
};
  // ── Derived stats ─────────────────────────────
  const bestStreak = habits.length
    ? Math.max(...habits.map((h) => streaks[h.id] || 0))
    : 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <ScreenShell
      scroll
      contentContainerStyle={styles.screenContent}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>Habit System</Text>
        <Text style={styles.title}>Build routines that are easy to maintain.</Text>
        <Text style={styles.subtitle}>
          Track small repeats, celebrate streaks, and keep the habit loop simple
          enough to survive busy days.
        </Text>
      </View>

      {/* Summary card */}
      <SurfaceCard style={styles.summaryCard}>
        <View style={[styles.summaryContent, isWide && styles.summaryContentWide]}>
          <SectionTitle
            eyebrow="Consistency"
            subtitle="Daily logging gives the coach more context for better guidance."
            title="Small actions add up faster than big resets."
          />
          <View style={styles.summaryStats}>
            <StatPill label="Active habits" value={habits.length} />
            <StatPill label="Top streak"    value={bestStreak} tone="warm" />
          </View>
        </View>
      </SurfaceCard>

      {/* Add habit card */}
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

      {/* Habit list */}
      {loading ? (
        <SurfaceCard style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading habits and streaks...</Text>
        </SurfaceCard>
      ) : habits.length ? (
        <View style={[styles.grid, isWide && styles.gridWide]}>
          {habits.map((item) => {
            const streak   = streaks[item.id] || 0;
            const isActive = activeHabitId === item.id;

            return (
              <SurfaceCard
                key={item.id}
                style={[styles.habitCard, isWide && styles.habitCardWide]}
              >
                {/* Habit header */}
                <View style={styles.habitHeader}>
                  <View style={styles.habitIcon}>
                    <Ionicons
                      color={colors.primary}
                      name="leaf-outline"
                      size={20}
                    />
                  </View>
                  <View style={styles.habitCopy}>
                    <Text style={styles.habitTitle}>{item.name}</Text>
                    <Text style={styles.habitSubtitle}>
                      Stay visible. Stay repeatable.
                    </Text>
                  </View>
                </View>

                {/* Streak badge */}
                <View style={styles.streakBadge}>
                  <Text style={styles.streakValue}>{streak}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>

                {/* ✅ Fix 4: inline styles extracted to StyleSheet */}
                {/* ✅ Fix 3: last7Days from useMemo, not recomputed per habit */}
                <View style={styles.logRow}>
                  {last7Days.map((date) => {
                    const status = logs[item.id]?.[date];
                    return (
                      <View key={date} style={styles.logDayColumn}>
                        <Pressable
                          disabled={isActive}
                          onPress={() => handleLog(item.id, status, date)}
                          style={[
                            styles.logDot,
                            status ? styles.logDotDone : styles.logDotMissed,
                            isActive && styles.logDotDisabled,
                          ]}
                        />
                        {/* Day number e.g. "24" */}
                        <Text style={styles.logDayLabel}>{date.slice(8)}</Text>
                      </View>
                    );
                  })}
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

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  screenContent:        { gap: spacing.lg, paddingBottom: 108 },
  headerCopy:           { gap: 4, marginTop: spacing.sm },
  eyebrow:              { color: colors.secondary, fontFamily: appFonts.heading,
                          fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 },
  title:                { color: colors.text, fontFamily: appFonts.display,
                          fontSize: 34, lineHeight: 40 },
  subtitle:             { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 15, lineHeight: 24, maxWidth: 650 },
  summaryCard:          { backgroundColor: "#f3f8f6" },
  summaryContent:       { gap: spacing.lg },
  summaryContentWide:   { flexDirection: "row", justifyContent: "space-between",
                          alignItems: "center" },
  summaryStats:         { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  addCard:              { gap: spacing.md },
  addRow:               { gap: spacing.md },
  addRowWide:           { flexDirection: "row", alignItems: "flex-end" },
  habitInput:           { flex: 1 },
  addButton:            { minWidth: 150 },
  loadingCard:          { alignItems: "center", gap: spacing.sm,
                          paddingVertical: spacing.xl },
  loadingText:          { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 14 },
  grid:                 { gap: spacing.lg },
  gridWide:             { flexDirection: "row", flexWrap: "wrap" },
  habitCard:            { gap: spacing.md },
  habitCardWide:        { width: "48%" },
  habitHeader:          { flexDirection: "row", gap: spacing.md,
                          alignItems: "center" },
  habitIcon:            { width: 48, height: 48, borderRadius: 24,
                          backgroundColor: "#e6f3f0", alignItems: "center",
                          justifyContent: "center" },
  habitCopy:            { flex: 1, gap: 2 },
  habitTitle:           { color: colors.text, fontFamily: appFonts.heading,
                          fontSize: 18 },
  habitSubtitle:        { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 13 },
  streakBadge:          { alignSelf: "flex-start", paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm, borderRadius: radius.pill,
                          backgroundColor: "#fff2d9" },
  streakValue:          { color: colors.text, fontFamily: appFonts.display,
                          fontSize: 24 },
  streakLabel:          { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 12 },
  // ✅ Fix 4: extracted from inline — stable references, no re-creation per render
  logRow:               { flexDirection: "row", marginTop: 10, gap: 6 },
  logDayColumn:         { alignItems: "center", gap: 4 },
  logDot:               { width: 28, height: 28, borderRadius: 6 },
  logDotDone:           { backgroundColor: "#4CAF50" },
  logDotMissed:         { backgroundColor: "#ddd" },
  logDotDisabled:       { opacity: 0.6 },
  logDayLabel:          { fontSize: 10, color: colors.textMuted,
                          fontFamily: appFonts.body },
});