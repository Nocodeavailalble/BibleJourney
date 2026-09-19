import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";

type SplashScreenProps = {
  onFinished: () => void;
};

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const { themeMode, fontColor } = useTheme();
  const isNight = themeMode === "night";

  // Main transition
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  // Logo entrance
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoTranslateY = useRef(new Animated.Value(12)).current;

  // Subtle breathing glow
  const glowOpacity = useRef(new Animated.Value(0.16)).current;
  const glowScale = useRef(new Animated.Value(0.82)).current;

  // Title
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(10)).current;

  // Subtitle
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(7)).current;

  // Decorative lines
  const leftLineScale = useRef(new Animated.Value(0)).current;
  const rightLineScale = useRef(new Animated.Value(0)).current;

  // Loading bar
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    /*
     * Logo breathing animation.
     * It remains subtle so the splash does not feel busy.
     */
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.38,
            duration: 1050,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.04,
            duration: 1050,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.16,
            duration: 1050,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.82,
            duration: 1050,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    /*
     * Logo entrance
     */
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),

      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(glowOpacity, {
        toValue: 0.3,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(glowScale, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(leftLineScale, {
        toValue: 1,
        duration: 430,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(rightLineScale, {
        toValue: 1,
        duration: 430,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    /*
     * Title entrance
     */
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    /*
     * Subtitle entrance
     */
    Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 420,
        delay: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(subtitleTranslateY, {
        toValue: 0,
        duration: 420,
        delay: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    /*
     * Loading bar
     */
    Animated.timing(progress, {
      toValue: 1,
      duration: 1550,
      delay: 250,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    breathingAnimation.start();

    /*
     * Finish splash.
     * Short enough that it does not slow down app startup.
     */
    const finishTimer = setTimeout(() => {
      if (!mounted) {
        return;
      }

      breathingAnimation.stop();

      // Noticeable but not aggressive completion haptic.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 360,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(screenScale, {
          toValue: 1.025,
          duration: 360,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && mounted) {
          onFinished();
        }
      });
    }, 2100);

    return () => {
      mounted = false;
      clearTimeout(finishTimer);
      breathingAnimation.stop();
    };
  }, [
    glowOpacity,
    glowScale,
    leftLineScale,
    logoOpacity,
    logoScale,
    logoTranslateY,
    onFinished,
    progress,
    rightLineScale,
    screenOpacity,
    screenScale,
    subtitleOpacity,
    subtitleTranslateY,
    titleOpacity,
    titleTranslateY,
  ]);

  const backgroundColor = isNight ? "#080B18" : "#F8FAF8";

  const primaryText = isNight ? "#F5F7FA" : "#182018";

  const secondaryText = isNight
    ? "rgba(245,247,250,0.55)"
    : "rgba(24,32,24,0.50)";

  const lineColor = isNight ? "rgba(255,255,255,0.20)" : "rgba(24,32,24,0.18)";

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor,
          opacity: screenOpacity,
          transform: [{ scale: screenScale }],
        },
      ]}
    >
      {/* Ambient glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: fontColor,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <View style={styles.center}>
        {/* Bible logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              {
                backgroundColor: fontColor,
              },
            ]}
          />

          <View style={styles.book}>
            {/* Left page */}
            <View
              style={[
                styles.bookPage,
                styles.bookLeft,
                {
                  borderColor: fontColor,
                },
              ]}
            />

            {/* Right page */}
            <View
              style={[
                styles.bookPage,
                styles.bookRight,
                {
                  borderColor: fontColor,
                },
              ]}
            />

            {/* Spine */}
            <View
              style={[
                styles.bookSpine,
                {
                  backgroundColor: fontColor,
                },
              ]}
            />

            {/* Bookmark */}
            <View
              style={[
                styles.bookmark,
                {
                  backgroundColor: fontColor,
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* App title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: primaryText,
              },
            ]}
          >
            Bible Journey
          </Text>
        </Animated.View>

        {/* Subtitle and decorative lines */}
        <Animated.View
          style={[
            styles.decorRow,
            {
              opacity: subtitleOpacity,
              transform: [
                {
                  translateY: subtitleTranslateY,
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: lineColor,
                transform: [{ scaleX: leftLineScale }],
              },
            ]}
          />

          <Text
            style={[
              styles.subtitle,
              {
                color: secondaryText,
              },
            ]}
          >
            Eat, Digest Assimilate Christ!
          </Text>

          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: lineColor,
                transform: [{ scaleX: rightLineScale }],
              },
            ]}
          />
        </Animated.View>

        {/* Minimal loading bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(24,32,24,0.09)",
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: fontColor,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    elevation: 10000,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  glow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    left: "50%",
    top: "50%",
    marginLeft: -95,
    marginTop: -115,
  },

  logoContainer: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },

  logoGlow: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
    opacity: 0.1,
  },

  book: {
    width: 64,
    height: 49,
    flexDirection: "row",
    position: "relative",
  },

  bookPage: {
    flex: 1,
    borderWidth: 2.1,
    backgroundColor: "transparent",
  },

  bookLeft: {
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
    borderRightWidth: 0.9,
    transform: [{ skewY: "-6deg" }],
  },

  bookRight: {
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderLeftWidth: 0.9,
    transform: [{ skewY: "6deg" }],
  },

  bookSpine: {
    position: "absolute",
    width: 2,
    top: 3,
    bottom: 3,
    left: "50%",
    marginLeft: -1,
  },

  bookmark: {
    position: "absolute",
    width: 8,
    height: 23,
    top: -1,
    left: "50%",
    marginLeft: -4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.95,
  },

  titleContainer: {
    marginTop: 19,
  },

  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -1.05,
  },

  decorRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  line: {
    height: 1,
    width: 28,
  },

  subtitle: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 1.7,
    marginHorizontal: 10,
  },

  progressContainer: {
    position: "absolute",
    bottom: 48,
    width: 74,
    alignItems: "center",
  },

  progressTrack: {
    width: 74,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
