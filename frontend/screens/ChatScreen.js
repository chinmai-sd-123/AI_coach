// screens/ChatScreen.jsx

import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import Markdown from "react-native-markdown-display";

import {
  Chip,
  PrimaryButton,
  ScreenShell,
  SectionTitle,
  SurfaceCard,
} from "../components/ui";
import { sendMessage, ApiError } from "../services/api";
import { getToken } from "../utils/auth";
import { appFonts, colors, radius, shadows, spacing } from "../theme";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_INPUT_LENGTH = 300;

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
    isLoading: false,
    isStreaming: false,
  },
];

const LOADING_MESSAGES = [
  "Thinking...",
  "Analyzing your habits...",
  "Finding the best advice...",
  "Checking your progress...",
  "Crafting your next step...",
];

let _msgCounter = 0;
const makeId = (prefix) => `${prefix}-${Date.now()}-${++_msgCounter}`;

// ─────────────────────────────────────────────
// TypingDots — animated "..." indicator
// Shown inside the placeholder bubble while API is in flight
// ─────────────────────────────────────────────

function TypingDots() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, []);

  return <Text style={styles.typingDots}>{dots}</Text>;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ChatScreen() {
  const { width }  = useWindowDimensions();
  const isWide     = width >= 920;
  const isCompact  = width < 640;

  const [message,    setMessage]    = useState("");
  const [chat,       setChat]       = useState(INITIAL_MESSAGES);
  const [token,      setToken]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const isAtBottomRef = useRef(true);


  // ── Load token ────────────────────────────────
  useEffect(() => {
    (async () => {
      const stored = await getToken();
      setToken(stored ?? "");
      setTokenReady(true);
    })();
  }, []);

  // ── Auto-scroll ───────────────────────────────
  useEffect(() => {
    const id = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      50,
    );
    return () => clearTimeout(id);
  }, [chat]);

  useEffect(() => {
  if (!isAtBottomRef.current) return; // ← user scrolled up, leave them alone
  const id = setTimeout(
    () => scrollRef.current?.scrollToEnd({ animated: true }),
    50,
  );
  return () => clearTimeout(id);
}, [chat]);

  // ── Append a new message ──────────────────────
  const appendMessage = useCallback(
    (role, text, idPrefix = role, extra = {}) => {
      const msg = { id: makeId(idPrefix), role, text,
                    isLoading: false, isStreaming: false, ...extra };
      setChat((prev) => [...prev, msg]);
      return msg.id; // ✅ return id so caller can reference it later
    },
    [],
  );

  // ── Update an existing message by id ─────────
  // ✅ Used to replace the placeholder bubble in-place
  //    instead of appending a new bubble after the loading one
  const updateMessageById = useCallback((id, patch) => {
    setChat((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)),
    );
  }, []);

  // ── Word-by-word streaming into a bubble ─────
  // ✅ Gives the appearance of streaming without requiring
  //    backend SSE changes — splits on whitespace, reveals
  //    one token at a time at ~35ms intervals (~28 words/sec)
const streamIntoMessage = useCallback(
  async (id, fullText) => {
    const tokens = fullText.split(/(\s+)/);
    let built = "";
    let pendingText = "";
    let rafId = null;

    for (const token of tokens) {
      built += token;
      pendingText = built;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updateMessageById(id, { text: pendingText, isStreaming: true });
          rafId = null;
        });
      }

      const delay = fullText.length < 80 ? 15 : 30;
      await new Promise((r) => setTimeout(r, delay));
    }

    if (rafId !== null) cancelAnimationFrame(rafId);
    updateMessageById(id, { text: fullText, isStreaming: false });
  },
  [updateMessageById],
);

  // ── Core send handler ─────────────────────────
  const handleSend = useCallback(
    async (presetText) => {
      const outgoing = (presetText ?? message).trim();

      // ── Cheap sync guards first ──
      if (!outgoing || loading) return;

      if (!tokenReady) {
        appendMessage(
          "assistant",
          "Still preparing your session — try again in a moment.",
          "assistant-notready",
        );
        return;
      }

      if (!token) {
        appendMessage(
          "assistant",
          "Your session has expired. Please log in again.",
          "assistant-auth",
        );
        return;
      }

      // ── Network check (async, after sync guards) ──
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        appendMessage(
          "assistant",
          "You're offline. Check your connection and try again.",
          "assistant-offline",
        );
        return;
      }

  if(abortRef.current) {
    abortRef.current.abort(); // cancel any in-flight request before starting a new one
  }
        const controller = new AbortController();
        abortRef.current = controller;


      // ── 1. Show user message immediately ─────
      appendMessage("user", outgoing, "user");
      isAtBottomRef.current = true; // user just sent a message, we can assume they want to be at the bottom
      scrollRef.current?.scrollToEnd({ animated: true });
      setMessage("");
      Keyboard.dismiss();
      setLoading(true);

      // ── 2. Inject placeholder bubble ─────────
      // ✅ Inline loading state — no separate ActivityIndicator overlay
      //    The bubble itself shows animated dots while API is in flight
      const randomLabel =
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

      const placeholderId = appendMessage(
        "assistant",
        randomLabel,
        "assistant-loading",
        { isLoading: true }, // ← signals TypingDots render
      );

      try {
        // ── 3. Call API ───────────────────────
        const res   = await sendMessage(outgoing, token, controller.signal);
        const reply =
          res?.reply ?? res?.response ?? res?.message ??
          "I didn't quite get that — could you try rephrasing?";

        // ── 4. Stream response into placeholder ──
        // ✅ isLoading → false immediately so dots disappear
        //    isStreaming → true so text reveals word by word
        updateMessageById(placeholderId, { isLoading: false, isStreaming: true, text: "" });
        await streamIntoMessage(placeholderId, reply);

      } catch (err) {
        // ── 5. Replace placeholder with error ──
        // ✅ Single bubble handles all states — no extra bubbles appended
        if(err.name === "AbortError") {
          setChat((prev) => prev.filter((msg) => msg.id !== placeholderId));
          return; // aborted — don't show error
        }

        const errorText =
          err instanceof ApiError && err.status === 401
            ? "Your session expired mid-chat. Please log in again."
            : err.message || "The coach could not respond right now.";

        updateMessageById(placeholderId, {
          text: errorText,
          isLoading: false,
          isStreaming: false,
        });
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [message, loading, token, tokenReady,
     appendMessage, updateMessageById, streamIntoMessage],
  );

  // ── Derived state ─────────────────────────────
  const charsLeft     = MAX_INPUT_LENGTH - message.length;
  const isOverLimit   = charsLeft < 0;
  const sendDisabled  = !tokenReady || loading || isOverLimit;
  const showCharCount = message.length > MAX_INPUT_LENGTH * 0.8;

  // ─────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────

  // ✅ Each bubble decides how to render its content:
  //    isLoading   → animated dots (API in flight)
  //    isStreaming → plain Text (mid-stream, Markdown parse would flicker)
  //    done        → Markdown (full response, safe to parse)
  const renderBubbleContent = (item) => {
    if (item.isLoading) {
      return (
        <View style={styles.typingRow}>
          <TypingDots />
          <Text style={styles.loadingLabel}>{item.text}</Text>
        </View>
      );
    }

    if (item.role === "user") {
  return (
    <Text style={[styles.messageText, styles.userMessageText]}>
      {item.text}
    </Text>
  );
}

return <Markdown style={markdownStyles}>{item.text}</Markdown>;
  };

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
        {/* Header */}
        <View style={styles.headerWrap}>
          <SectionTitle
            eyebrow="AI Coach"
            subtitle={
              isCompact
                ? undefined
                : "Use the chat for planning, reflection, and habit support."
            }
            title={
              isCompact
                ? "Talk with your coach"
                : "Talk through the next best move."
            }
          />
        </View>

        {/* Chat layout */}
        <View
          style={[
            styles.chatLayout,
            isCompact && styles.chatLayoutCompact,
            isWide    && styles.chatLayoutWide,
          ]}
        >
          {/* Wide sidebar */}
          {isWide && (
            <SurfaceCard style={[styles.introCard, styles.sidebarCard]}>
              <Text style={styles.introTitle}>Start with a clear prompt</Text>
              <Text style={styles.introText}>
                The more specific you are, the more practical the coaching becomes.
              </Text>
              <View style={styles.promptList}>
                {STARTER_PROMPTS.map((p) => (
                  <Chip key={p} onPress={() => handleSend(p)} title={p} />
                ))}
              </View>
            </SurfaceCard>
          )}

          {/* Chat card */}
          <SurfaceCard
            style={[styles.chatCard, isCompact && styles.chatCardCompact]}
          >
            {/* Mobile chips */}
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
                  {STARTER_PROMPTS.map((p) => (
                    <Chip
                      key={p}
                      onPress={() => handleSend(p)}
                      style={styles.mobilePromptChip}
                      title={p}
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
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              scrollEventThrottle={100}
              onScroll={({nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
                isAtBottomRef.current = distanceFromBottom < 40; // consider "at bottom" if within 40px
              }}
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

                  {renderBubbleContent(item)}
                </View>
              ))}
            </ScrollView>

            {/* Composer */}
            <View style={styles.composer}>
              <View
                style={[
                  styles.composerInputWrap,
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
                  maxLength={MAX_INPUT_LENGTH + 20}
                  onChangeText={setMessage}
                  placeholder="Ask for guidance, planning help, or a habit strategy..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.composerInput}
                  value={message}
                  onSubmitEditing={() => handleSend()}
                  blurOnSubmit={false}
                />
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
                disabled={sendDisabled}
                loading={false}
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
// Markdown styles — maps to app theme
// ✅ Defined outside component — never recreated on re-render
// ─────────────────────────────────────────────

const markdownStyles = {
  body: {
    color: colors.text,
    fontFamily: appFonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  strong: {
    fontFamily: appFonts.heading,
    color: colors.text,
  },
  em: {
    fontStyle: "italic",
    color: colors.textMuted,
  },
  bullet_list: {
    marginTop: 4,
  },
  list_item: {
    marginBottom: 2,
  },
  code_inline: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  fence: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  heading2: {
    fontFamily: appFonts.heading,
    fontSize: 17,
    marginTop: spacing.sm,
    marginBottom: 2,
    color: colors.text,
  },
  heading3: {
    fontFamily: appFonts.heading,
    fontSize: 15,
    marginTop: 4,
    color: colors.text,
  },
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  screenContent:        { paddingHorizontal: 0, paddingBottom: 68 },
  keyboard:             { flex: 1, minHeight: 0, paddingHorizontal: spacing.lg,
                          paddingTop: spacing.sm, gap: spacing.lg },
  headerWrap:           { paddingTop: 4 },
  chatLayout:           { flex: 1, minHeight: 0, gap: spacing.lg,
                          paddingBottom: spacing.md },
  chatLayoutCompact:    { gap: spacing.md, paddingBottom: spacing.sm },
  chatLayoutWide:       { flexDirection: "row", alignItems: "stretch" },
  introCard:            { gap: spacing.md },
  sidebarCard:          { width: 280 },
  introTitle:           { color: colors.text, fontFamily: appFonts.heading,
                          fontSize: 20 },
  introText:            { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 14, lineHeight: 22 },
  promptList:           { flexDirection: "row", flexWrap: "wrap",
                          gap: spacing.sm },
  chatCard:             { flex: 1, minHeight: 0, gap: spacing.md,
                          paddingBottom: spacing.md },
  chatCardCompact:      { padding: spacing.md, gap: spacing.sm },
  mobilePromptBlock:    { gap: spacing.sm },
  mobilePromptList:     { paddingRight: spacing.sm, gap: spacing.sm },
  mobilePromptChip:     { marginRight: spacing.sm },
  messageScroll:        { flex: 1, minHeight: 0, borderRadius: radius.md,
                          backgroundColor: "#fcf7f0" },
  messageList:          { flexGrow: 1, justifyContent: "flex-end",
                          gap: spacing.sm, paddingHorizontal: spacing.xs,
                          paddingVertical: spacing.sm },
  messageBubble:        { maxWidth: "92%", borderRadius: radius.lg,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm, gap: 8 },
  messageBubbleCompact: { maxWidth: "95%" },
  assistantBubble:      { alignSelf: "flex-start",
                          backgroundColor: colors.surfaceMuted,
                          borderWidth: 1, borderColor: colors.border },
  userBubble:           { alignSelf: "flex-end",
                          backgroundColor: colors.primary, ...shadows.soft },
  messageRole:          { color: colors.primaryDeep,
                          fontFamily: appFonts.heading, fontSize: 12,
                          textTransform: "uppercase", letterSpacing: 1 },
  userRole:             { color: "#dff4f0" },
  messageText:          { color: colors.text, fontFamily: appFonts.body,
                          fontSize: 16, lineHeight: 24 },
  userMessageText:      { color: colors.white },
  // ✅ Typing dots row
  typingRow:            { flexDirection: "row", alignItems: "center",
                          gap: spacing.sm },
  typingDots:           { color: colors.primary, fontFamily: appFonts.heading,
                          fontSize: 20, lineHeight: 24, letterSpacing: 2 },
  loadingLabel:         { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 14, fontStyle: "italic" },
  composer:             { flexDirection: "row", gap: spacing.sm,
                          alignItems: "center", paddingTop: spacing.xs },
  composerInputWrap:    { flex: 1, minHeight: 54, maxHeight: 120,
                          flexDirection: "row", alignItems: "center",
                          gap: spacing.sm, paddingHorizontal: spacing.md,
                          paddingVertical: 10, borderRadius: radius.md,
                          backgroundColor: colors.white,
                          borderWidth: 1, borderColor: colors.border },
  composerInputWrapError: { borderColor: colors.error ?? "#e53e3e" },
  composerInput:        { flex: 1, minHeight: 22, maxHeight: 96,
                          color: colors.text, fontFamily: appFonts.body,
                          fontSize: 15, lineHeight: 20,
                          paddingTop: 0, paddingBottom: 0,
                          ...(Platform.OS === "android"
                            ? { textAlignVertical: "center" } : {}) },
  charCount:            { color: colors.textMuted, fontFamily: appFonts.body,
                          fontSize: 12, minWidth: 28, textAlign: "right" },
  charCountError:       { color: colors.error ?? "#e53e3e", fontWeight: "600" },
  sendButton:           { width: 54, minWidth: 54, height: 54, minHeight: 54,
                          alignSelf: "center", paddingHorizontal: 0,
                          borderRadius: radius.md },
});