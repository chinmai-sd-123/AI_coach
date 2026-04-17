import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { loginUser } from "../services/api";
import { saveToken } from "../utils/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleLogin = async () => {
  try {
    const data = await loginUser(email, password);

    if (data.access_token) {
      await saveToken(data.access_token);

      Alert.alert("Success", "Login successful ");

      navigation.replace("Home");  // ðŸ‘ˆ move to home
    } else {
      Alert.alert("Error", data.detail || "Invalid login");
    }
  } catch (error) {
  console.log("ERROR:", error);
  Alert.alert("Error", error.message || "Something went wrong");
}
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Life Coach</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <Text
  onPress={() => navigation.navigate("Signup")}
  style={{ textAlign: "center", marginTop: 10, color: "blue" }}
>
  Don't have an account? Sign Up
</Text>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});
