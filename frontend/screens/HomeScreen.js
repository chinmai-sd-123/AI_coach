import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
} from "react-native";

import { getGoals, createGoal } from "../services/api";
import { getToken, removeToken } from "../utils/auth";

export default function HomeScreen({ navigation }) {
  const [goal, setGoal] = useState("");
  const [goals, setGoals] = useState([]);
  const [token, setToken] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const storedToken = await getToken();
    setToken(storedToken);

    const data = await getGoals(storedToken);
    setGoals(data);
  };

const handleAddGoal = async () => {
  if (!goal.trim()) return;

  try {
    await createGoal(goal, token);

    setGoal("");

    // ðŸ”¥ force fresh fetch
    const updatedGoals = await getGoals(token);
    setGoals(updatedGoals);

  } catch (err) {
    console.log("ADD GOAL ERROR:", err.message || err);
  }
};

  const handleLogout = async () => {
    await removeToken();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Goals </Text>

      <TextInput
        placeholder="Enter goal"
        value={goal}
        onChangeText={setGoal}
        style={styles.input}
      />

      <Button title="Add Goal" onPress={handleAddGoal} />

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text style={styles.goal}>{item.title}</Text>
        )}
      />
      <Button
  title="AI Coach 🤖"
  onPress={() => navigation.navigate("Chat")}
/>
      
<Button
  title="Go to Habits"
  onPress={() => navigation.navigate("Habits")}
/>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, marginBottom: 10 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  goal: {
    padding: 10,
    borderBottomWidth: 1,
  },
});
