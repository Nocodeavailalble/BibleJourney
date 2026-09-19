import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs, router, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import SplashScreen from "../components/SplashScreen";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";

/*
 * Prevents the splash screen from appearing again
 * when the Expo Router layout is remounted during
 * the same app session.
 */
let hasShownSplash = false;

function HapticTabButton(props: any) {
  const { onPress, ...rest } = props;

  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        void Haptics.selectionAsync();
        onPress?.(event);
      }}
    />
  );
}

function OnboardingGate() {
  const segments = useSegments();
  const isOnboarding = segments[0] === "onboarding";

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

        if (completed !== "true" && !isOnboarding) {
          router.replace("/onboarding");
        }
      } catch (error) {
        console.log("Error checking onboarding:", error);
      }
    }

    void checkOnboarding();
  }, [isOnboarding]);

  return null;
}

function TabBarBackground() {
  const { themeMode } = useTheme();
  const isNight = themeMode === "night";

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={80}
        tint={isNight ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isNight
              ? "rgba(13,16,28,0.76)"
              : "rgba(255,255,255,0.74)",
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.reflection,
          {
            backgroundColor: isNight
              ? "rgba(255,255,255,0.10)"
              : "rgba(255,255,255,0.54)",
          },
        ]}
      />
    </View>
  );
}

function MainTabs() {
  const { fontColor, themeMode } = useTheme();
  const isNight = themeMode === "night";

  const tabBarStyle: StyleProp<ViewStyle> = [
    styles.tabBar,
    {
      borderColor: isNight ? "rgba(255,255,255,0.12)" : "rgba(24,24,24,0.10)",
      shadowColor: isNight ? "#000000" : "#64748B",
      shadowOpacity: isNight ? 0.24 : 0.1,
    },
  ];

  return (
    <>
      <OnboardingGate />

      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarStyle,

          tabBarBackground: () => <TabBarBackground />,

          tabBarActiveTintColor: fontColor,

          tabBarInactiveTintColor: isNight
            ? "rgba(255,255,255,0.42)"
            : "rgba(24,24,24,0.42)",

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            marginBottom: Platform.OS === "ios" ? 0 : 2,
          },

          tabBarItemStyle: {
            paddingTop: 4,
          },
        }}
      >
        {/* HOME */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarButton: (props) => <HapticTabButton {...props} />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="home-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* BIBLE */}
        <Tabs.Screen
          name="bible"
          options={{
            title: "Bible",
            tabBarButton: (props) => <HapticTabButton {...props} />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* DASHBOARD */}
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Dashboard",
            tabBarButton: (props) => <HapticTabButton {...props} />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* SETTINGS */}
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarButton: (props) => <HapticTabButton {...props} />,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="cog-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* HIDDEN ROUTES */}
        <Tabs.Screen
          name="onboarding"
          options={{
            href: null,
            tabBarStyle: {
              display: "none",
            },
          }}
        />

        <Tabs.Screen
          name="reading"
          options={{
            href: null,
            tabBarStyle: {
              display: "none",
            },
          }}
        />

        <Tabs.Screen
          name="about"
          options={{
            href: null,
            tabBarStyle: {
              display: "none",
            },
          }}
        />

        <Tabs.Screen
          name="explore"
          options={{
            href: null,
            tabBarStyle: {
              display: "none",
            },
          }}
        />
      </Tabs>
    </>
  );
}

function AppNavigator() {
  /*
   * The splash is shown only if it has not already
   * completed during this JavaScript session.
   */
  const [splashVisible, setSplashVisible] = useState(!hasShownSplash);

  const finishSplash = useCallback(() => {
    hasShownSplash = true;
    setSplashVisible(false);
  }, []);

  return (
    <ThemeProvider>
      <View style={styles.appRoot}>
        <MainTabs />

        {splashVisible && (
          <View pointerEvents="auto" style={styles.splashOverlay}>
            <SplashScreen onFinished={finishSplash} />
          </View>
        )}
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <AppNavigator />;
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },

  tabBar: {
    position: "absolute",

    left: 12,
    right: 12,
    bottom: 10,

    height: 72,

    borderRadius: 24,

    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,

    overflow: "hidden",

    paddingTop: 5,
    paddingBottom: 5,

    shadowRadius: 18,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  reflection: {
    position: "absolute",

    top: 0,
    left: 18,
    right: 18,

    height: 1,
  },
});
