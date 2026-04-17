import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";

import { sendMessage} from "../services/api";
import { getToken } from "../utils/auth";

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMsg = { role: "user", text: message };
    setChat((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
  const storedToken = await getToken();

  const res = await sendMessage(message, storedToken);

  console.log("FINAL CHAT DATA:", res); // 🔥 IMPORTANT

  const aiMsg = {
    role: "ai",
    text: res.response || res.message || "No reply",
  };

  setChat((prev) => [...prev, aiMsg]);

} catch (err) {
  console.log("CHAT ERROR:", err.message);
} finally {
  setLoading(false);
}

  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chat}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Text
            style={
              item.role === "user" ? styles.userMsg : styles.aiMsg
            }
          >
            {item.text}
          </Text>
        )}
      />
      {loading && <Text style={{ margin: 10 }}>AI is thinking... 🤖</Text>}

      <View style={styles.inputRow}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ask your AI coach..."
          style={styles.input}
        />

        <TouchableOpacity onPress={handleSend} style={styles.button}>
          <Text style={{ color: "white" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },

  userMsg: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
  },

  aiMsg: {
    alignSelf: "flex-start",
    backgroundColor: "#EEE",
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
  },

  inputRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },

  button: {
    backgroundColor: "#4CAF50",
    padding: 10,
    marginLeft: 5,
    borderRadius: 8,
  },
});