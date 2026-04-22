// screens/ChatScreen.jsx

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import NetInfo from "@react-native-community/netinfo";
import {
  Chip,
  PrimaryButton,
  ScreenShell,
  SectionTitle,
  SurfaceCard,
} from "../components/ui";
import { sendMessage,ApiError } from "../services/api";

import { getToken } from "../utils/auth";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

// ─────────────────────────────────────────────
// Constants — defined outside component so they
// are never recreated on re-render
// ─────────────────────────────────────────────

const MAX_INPUT_LENGTH = 300; // ✅ mirrors backend ChatRequest.message max_length

const STARTER_PROMPTS = [
  "Help me plan my day",
  "How can I stay consistent this week?",
  "Suggest a habit for better focus",
];

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    text: "I'm ready to help you think clearly, make a plan, and keep your goals realistic. What feels most important today?",
  },
];

const LOADING_MESSAGE = [
  "Thinking...",
  "Analyzing your habits...",
  "Finding the best advice...",
  "Reviewing your progress...",
];

// ✅ Generates a collision-resistant ID for messages
// Date.now() alone can collide if two messages are created in the same ms
let _msgCounter = 0;
const makeId = (prefix) => `${prefix}-${Date.now()}-${++_msgCounter}`;

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ChatScreen() {
  const { width } = useWindowDimensions();
  const isWide    = width >= 920;
  const isCompact = width < 640;

  const [message,    setMessage]    = useState("");
  const [chat,       setChat]       = useState(INITIAL_MESSAGES);
  const [token,      setToken]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGE[0]);
  const scrollRef = useRef(null);

  // ── Load auth token on mount ──────────────────
  useEffect(() => {
    (async () => {
      const stored = await getToken();
      setToken(stored ?? "");
      setTokenReady(true);
    })();
  }, []);

  // ── Auto-scroll on new messages or loading state ──
  useEffect(() => {
    // Small delay lets the layout settle before scrolling
    const id = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      50,
    );
    return () => clearTimeout(id); // ✅ cleanup avoids scroll after unmount
  }, [chat, loading]);

  // ── Append a message to chat history ─────────
  // ✅ Extracted helper — keeps handleSend readable
  const appendMessage = useCallback((role, text, idPrefix = role) => {
    setChat((prev) => [...prev, { id: makeId(idPrefix), role, text }]);
  }, []);

  // ── Core send handler ─────────────────────────
  // ✅ useCallback — stable reference, safe to pass to Chip onPress
  const handleSend = useCallback(
    async (presetText) => {
      const outgoing = (presetText ?? message).trim();

      
      // Guard: empty input or mid-flight request
      if (!outgoing || loading) return;

      // Guard: token not loaded yet
      if (!tokenReady) {
        appendMessage(
          "assistant",
          "Still preparing your session — try again in a moment.",
          "assistant-notready",
        );
        return;
      }

      // Guard: token missing after loading
      if (!token) {
        appendMessage(
          "assistant",
          "Your session has expired. Please log in again.",
          "assistant-auth",
        );
        return;
      }
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        appendMessage(
           "assistant",
    "You're offline. Check your connection.",
    "assistant-offline"
        );
        return;
      }
      setLoadingText(
        LOADING_MESSAGE[Math.floor(Math.random() * LOADING_MESSAGE.length)]
      );

      // Optimistically append the user message
      appendMessage("user", outgoing, "user");
      setMessage("");
      Keyboard.dismiss(); // ✅ close keyboard after sending on mobile
      setLoading(true);

      try {
        const res = await sendMessage(outgoing, token);

        // ✅ Fallback chain: handles varying API response shapes
        const reply =
           res?.reply ?? res?.response ?? res?.message;

        appendMessage(
          "assistant",
          reply || "I didn’t quite get that — could you try rephrasing?"
);
      } catch (err) {
        // ✅ ApiError carries a status code — handle 401 distinctly
        if (err instanceof ApiError && err.status === 401) {
          appendMessage(
            "assistant",
            "Your session expired mid-chat. Please log in again.",
            "assistant-expired",
          );
          return;
        }

        // Generic error: show inside the chat, not a modal Alert
        appendMessage(
          "assistant",
          err.message || "The coach could not respond right now.",
          "assistant-error",
        );
      } finally {
        // ✅ Always runs — loading resets even if catch block throws
        setLoading(false);
        setLoadingText(LOADING_MESSAGE[0]); // reset to default for next time
      }
    },
    [message, loading, token, tokenReady, appendMessage],
  );

  // ── Derived UI state ──────────────────────────
  const charsLeft      = MAX_INPUT_LENGTH - message.length;
  const isOverLimit    = charsLeft < 0;
  const sendDisabled   = !tokenReady || loading || isOverLimit;
  const showCharCount  = message.length > MAX_INPUT_LENGTH * 0.8; // ✅ show counter at 80%

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <ScreenShell
      contentContainerStyle={styles.screenContent}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 8}
        enabled
        style={styles.keyboard}
      >
        {/* ── Header ── */}
        <View style={styles.headerWrap}>
          <SectionTitle
            eyebrow="AI Coach"
            subtitle={
              isCompact
                ? undefined
                : "Use the chat for planning, reflection, and habit support."
            }
            title={
              isCompact ? "Talk with your coach" : "Talk through the next best move."
            }
          />
        </View>

        {/* ── Chat layout ── */}
        <View
          style={[
            styles.chatLayout,
            isCompact && styles.chatLayoutCompact,
            isWide   && styles.chatLayoutWide,
          ]}
        >
          {/* Wide sidebar with starter prompts */}
          {isWide && (
            <SurfaceCard style={[styles.introCard, styles.sidebarCard]}>
              <Text style={styles.introTitle}>Start with a clear prompt</Text>
              <Text style={styles.introText}>
                The more specific you are, the more practical the coaching becomes.
              </Text>
              <View style={styles.promptList}>
                {STARTER_PROMPTS.map((prompt) => (
                  <Chip
                    key={prompt}
                    onPress={() => handleSend(prompt)}
                    title={prompt}
                  />
                ))}
              </View>
            </SurfaceCard>
          )}

          {/* Main chat card */}
          <SurfaceCard
            style={[styles.chatCard, isCompact && styles.chatCardCompact]}
          >
            {/* Mobile horizontal prompt chips */}
            {!isWide && (
              <View style={styles.mobilePromptBlock}>
                {!isCompact && (
                  <>
                    <Text style={styles.introTitle}>Quick start</Text>
                    <Text style={styles.introText}>
                      Tap a prompt or type your own question below.
                    </Text>
                  </>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mobilePromptList}
                >
                  {STARTER_PROMPTS.map((prompt) => (
                    <Chip
                      key={prompt}
                      onPress={() => handleSend(prompt)}
                      style={styles.mobilePromptChip}
                      title={prompt}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Message list */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messageList}
              style={styles.messageScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              // ✅ Keeps scroll position stable when keyboard opens
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            >
              {chat.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.messageBubble,
                    isCompact && styles.messageBubbleCompact,
                    item.role === "user"
                      ? styles.userBubble
                      : styles.assistantBubble,
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

              {/* Typing indicator */}
              {loading && (
                <View
                  style={[
                    styles.messageBubble,
                    styles.assistantBubble,
                    styles.loadingBubble,
                  ]}
                >
                  <ActivityIndicator color={colors.primary} size="small" />
    
                  <Text style={styles.loadingLabel}>{loadingText}</Text>
                </View>
              )}
            </ScrollView>

            {/* Composer */}
            <View style={styles.composer}>
              <View
                style={[
                  styles.composerInputWrap,
                  // ✅ Visual feedback when over the character limit
                  isOverLimit && styles.composerInputWrapError,
                ]}
              >
                <Ionicons
                  color={colors.textMuted}
                  name="create-outline"
                  size={18}
                />
                <TextInput
                  multiline
                  maxLength={MAX_INPUT_LENGTH + 20} // ✅ soft cap with visible counter
                  onChangeText={setMessage}
                  placeholder="Ask for guidance, planning help, or a habit strategy..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.composerInput}
                  value={message}
                  // ✅ submit on return key on hardware keyboards (tablets/web)
                  onSubmitEditing={() => handleSend()}
                  blurOnSubmit={false}
                />
                {/* ✅ Character counter — only visible near/over limit */}
                {showCharCount && (
                  <Text
                    style={[
                      styles.charCount,
                      isOverLimit && styles.charCountError,
                    ]}
                  >
                    {charsLeft}
                  </Text>
                )}
              </View>

              <PrimaryButton
                icon={
                  <Ionicons
                    color={colors.white}
                    name="arrow-up-outline"
                    size={18}
                  />
                }
                disabled={sendDisabled} // ✅ unified disabled state
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

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

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
  // ✅ Red border when over character limit
  composerInputWrapError: {
    borderColor: colors.error ?? "#e53e3e",
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
  charCount: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 12,
    minWidth: 28,
    textAlign: "right",
  },
  charCountError: {
    color: colors.error ?? "#e53e3e",
    fontWeight: "600",
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
