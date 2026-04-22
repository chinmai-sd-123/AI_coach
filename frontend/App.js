import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HabitsScreen from "./screens/HabitScreen";
import ChatScreen from "./screens/ChatScreen";
import { ScreenShell } from "./components/ui";
import { getToken, removeToken } from "./utils/auth";
import { appFonts, colors, navigationTheme, radius, shadows } from "./theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <ScreenShell contentContainerStyle={styles.loadingShell} edges={["top", "bottom"]}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>Preparing your coach space</Text>
        <Text style={styles.loadingText}>
          Restoring your session and setting up the dashboard.
        </Text>
      </View>
    </ScreenShell>
  );
}

function AppTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#8c8b86",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, focused, size }) => {
          const icons = {
            Dashboard: focused ? "home" : "home-outline",
            Habits: focused ? "repeat" : "repeat-outline",
            Coach: focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline",
          };

          return <Ionicons color={color} name={icons[route.name]} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard">
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Coach" component={ChatScreen} />
    </Tab.Navigator>
  );
}

function AuthStack({ onAuthenticated }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onAuthenticated={onAuthenticated} />}
      </Stack.Screen>
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getToken();
        setIsAuthenticated(Boolean(token));
      } finally {
        setBootstrapping(false);
      }
    };

    restoreSession();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await removeToken();
    setIsAuthenticated(false);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" />
          {bootstrapping ? (
            <LoadingScreen />
          ) : isAuthenticated ? (
            <AppTabs onLogout={handleLogout} />
          ) : (
            <AuthStack onAuthenticated={handleAuthenticated} />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingShell: {
    flex: 1,
    justifyContent: "center",
  },
  loadingCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 28,
    gap: 12,
    ...shadows.card,
  },
  loadingTitle: {
    color: colors.text,
    fontFamily: appFonts.heading,
    fontSize: 22,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: appFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 72,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  tabBarLabel: {
    fontFamily: appFonts.body,
    fontSize: 12,
    paddingBottom: 4,
  },
});
