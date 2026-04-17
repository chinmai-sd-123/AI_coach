import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  Chip,
  PrimaryButton,
  ScreenShell,
  SectionTitle,
  SurfaceCard,
} from "../components/ui";
import { sendMessage } from "../services/api";
import { getToken } from "../utils/auth";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

const starterPrompts = [
  "Help me plan my day",
  "How can I stay consistent this week?",
  "Suggest a habit for better focus",
];

const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    text: "I'm ready to help you think clearly, make a plan, and keep your goals realistic. What feels most important today?",
  },
];

export default function ChatScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const isCompact = width < 640;
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState(initialMessages);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await getToken();
      setToken(storedToken || "");
      setTokenReady(true);
    };

    loadToken();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chat, loading]);

  const handleSend = async (presetText) => {
    const outgoingMessage = (presetText ?? message).trim();

    if (!outgoingMessage || loading) {
      return;
    }

    if (!token) {
      setChat((prev) => [
        ...prev,
        {
          id: `assistant-auth-${Date.now()}`,
          role: "assistant",
          text: tokenReady
            ? "Your session is missing. Please log in again and retry the coach."
            : "Still preparing your session. Try sending that again in a moment.",
        },
      ]);
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: outgoingMessage,
    };

    setChat((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await sendMessage(outgoingMessage, token);
      const responseText = res.response || res.message || "No reply received yet.";

      setChat((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: responseText,
        },
      ]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: err.message || "The coach could not respond right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      contentContainerStyle={styles.screenContent}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.keyboard}
      >
        <View style={styles.headerWrap}>
          <SectionTitle
            eyebrow="AI Coach"
            subtitle={
              isCompact ? undefined : "Use the chat for planning, reflection, and habit support."
            }
            title={isCompact ? "Talk with your coach" : "Talk through the next best move."}
          />
        </View>

        <View
          style={[
            styles.chatLayout,
            isCompact && styles.chatLayoutCompact,
            isWide && styles.chatLayoutWide,
          ]}
        >
          {isWide ? (
            <SurfaceCard style={[styles.introCard, styles.sidebarCard]}>
              <Text style={styles.introTitle}>Start with a clear prompt</Text>
              <Text style={styles.introText}>
                The more specific you are, the more practical the coaching becomes.
              </Text>

              <View style={styles.promptList}>
                {starterPrompts.map((prompt) => (
                  <Chip key={prompt} onPress={() => handleSend(prompt)} title={prompt} />
                ))}
              </View>
            </SurfaceCard>
          ) : null}

          <SurfaceCard style={[styles.chatCard, isCompact && styles.chatCardCompact]}>
            {!isWide ? (
              <View style={styles.mobilePromptBlock}>
                {!isCompact ? <Text style={styles.introTitle}>Quick start</Text> : null}
                {!isCompact ? (
                  <Text style={styles.introText}>
                    Tap a prompt or type your own question below.
                  </Text>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mobilePromptList}
                >
                  {starterPrompts.map((prompt) => (
                    <Chip
                      key={prompt}
                      onPress={() => handleSend(prompt)}
                      style={styles.mobilePromptChip}
                      title={prompt}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messageList}
              style={styles.messageScroll}
              showsVerticalScrollIndicator={false}
            >
              {chat.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.messageBubble,
                    isCompact && styles.messageBubbleCompact,
                    item.role === "user" ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageRole,
                      item.role === "user" && styles.userRole,
                    ]}
                  >
                    {item.role === "user" ? "You" : "Coach"}
                  </Text>
                  <Text
                    style={[
                      styles.messageText,
                      item.role === "user" && styles.userMessageText,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              ))}

              {loading ? (
                <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.loadingLabel}>Thinking through your request...</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.composer}>
              <View style={styles.composerInputWrap}>
                <Ionicons color={colors.textMuted} name="create-outline" size={18} />
                <TextInput
                  multiline
                  onChangeText={setMessage}
                  placeholder="Ask for guidance, planning help, or a habit strategy..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.composerInput}
                  value={message}
                />
              </View>

              <PrimaryButton
                icon={<Ionicons color={colors.white} name="arrow-up-outline" size={18} />}
                disabled={!tokenReady}
                loading={loading}
                onPress={() => handleSend()}
                style={styles.sendButton}
                title=""
              />
            </View>
          </SurfaceCard>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 68,
  },
  keyboard: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  headerWrap: {
    paddingTop: 4,
  },
  chatLayout: {
    flex: 1,
    minHeight: 0,
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  chatLayoutCompact: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  chatLayoutWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  introCard: {
    gap: spacing.md,
  },
  sidebarCard: {
    width: 280,
  },
  introTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 20,
  },
  introText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  promptList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chatCard: {
    flex: 1,
    minHeight: 0,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  chatCardCompact: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  mobilePromptBlock: {
    gap: spacing.sm,
  },
  mobilePromptList: {
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  mobilePromptChip: {
    marginRight: spacing.sm,
  },
  messageScroll: {
    flex: 1,
    minHeight: 0,
    borderRadius: radius.md,
    backgroundColor: "#fcf7f0",
  },
  messageList: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  messageBubble: {
    maxWidth: "92%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  messageBubbleCompact: {
    maxWidth: "95%",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  messageRole: {
    color: colors.primaryDeep,
    fontFamily: appFonts.heading,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  userRole: {
    color: "#dff4f0",
  },
  messageText: {
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: {
    color: colors.white,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingLabel: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
  },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  composerInputWrap: {
    flex: 1,
    minHeight: 54,
    maxHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composerInput: {
    flex: 1,
    minHeight: 22,
    maxHeight: 96,
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
    ...(Platform.OS === "android" ? { textAlignVertical: "center" } : {}),
  },
  sendButton: {
    width: 54,
    minWidth: 54,
    height: 54,
    minHeight: 54,
    alignSelf: "center",
    paddingHorizontal: 0,
    borderRadius: radius.md,
  },
});
