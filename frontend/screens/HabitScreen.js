import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";

import { getHabits, createHabit, logHabit } from "../services/api";
import { getToken } from "../utils/auth";

export default function HabitsScreen() {
  const [habit, setHabit] = useState("");
  const [habits, setHabits] = useState([]);
  const [token, setToken] = useState("");
  const [streaks, setStreaks] = useState({});

  // 🔥 Load habits on screen load
  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const storedToken = await getToken();
      setToken(storedToken);

      const data = await getHabits(storedToken);
      setHabits(data);
      // Load streaks for each habit
      const streakData = {};
      for (let h of data) {
        const streakRes = await getHabitStreak(h.id, storedToken);
        streakData[h.id] = streakRes.streak;
      }
      setStreaks(streakData);


    } catch (err) {
      console.log("LOAD HABITS ERROR:", err.message);
    }
  };

  // 🔥 Add habit
  const handleAddHabit = async () => {
    if (!habit.trim()) return;

    try {
      await createHabit(habit, token);
      setHabit("");

      const updated = await getHabits(token);
      setHabits(updated);
    } catch (err) {
      console.log("ADD HABIT ERROR:", err.message);
      Alert.alert("Error", err.message);
    }
  };

  // 🔥 Mark habit (done / missed)
  const handleLog = async (id, status) => {
    try {
      await logHabit(id, status, token);
      Alert.alert("Success", status ? "Marked Done ✅" : "Marked Missed ❌");

      // Refresh streak for this habit
      loadHabits();

    } catch (err) {
      console.log("LOG ERROR:", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Habits 🔁</Text>

      {/* Input */}
      <TextInput
        placeholder="Enter habit (e.g., Gym)"
        value={habit}
        onChangeText={setHabit}
        style={styles.input}
      />

      <Button title="Add Habit" onPress={handleAddHabit} />

      {/* Habit List */}
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.habitText}>
  {item.name} 🔥 {streaks[item.id] || 0}
</Text>

            <View style={styles.buttons}>
              <Button title="✅" onPress={() => handleLog(item.id, true)} />
              <Button title="❌" onPress={() => handleLog(item.id, false)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 15,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
  },
  habitText: {
    fontSize: 16,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
});