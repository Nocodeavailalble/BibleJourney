import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";

import {
  FONT_COLORS,
  FontColor,
  ThemeMode,
  useTheme,
} from "../theme/ThemeContext";

import {
  requestNotificationPermission,
  saveReminderTime,
  scheduleDailyReadingNotifications,
} from "../utils/notifications";

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";
const START_DATE_KEY = "startDate";
const NOTIFICATIONS_ENABLED_KEY = "notificationsEnabled";
const REMINDER_HOUR_KEY = "reminderHour";
const REMINDER_MINUTE_KEY = "reminderMinute";
const REMINDER_TIME_KEY = "reminderTime";

const TOTAL_STEPS = 7;

type DisplayModeOption = {
  mode: ThemeMode;
  label: string;
};

const DISPLAY_MODES: DisplayModeOption[] = [
  {
    mode: "day",
    label: "Day Mode",
  },
  {
    mode: "night",
    label: "Night Mode",
  },
];

export default function OnboardingScreen() {
  const { reset } = useLocalSearchParams<{
    reset?: string;
  }>();

  const isReset = reset === "true";

  const { fontColor, themeMode, setFontColor, setThemeMode } = useTheme();

  const isNight = themeMode === "night";

  const today = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  const [step, setStep] = useState(0);

  const [startDate, setStartDate] = useState<Date>(today);

  const [reminderTime, setReminderTimeState] = useState<Date>(
    new Date(2000, 0, 1, 20, 0, 0, 0),
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const [showReminderPicker, setShowReminderPicker] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (isReset) {
        setStep(0);
        setStartDate(today);
        setReminderTimeState(new Date(2000, 0, 1, 20, 0, 0, 0));
        setNotificationsEnabled(false);

        return;
      }

      try {
        const savedStartDate = await AsyncStorage.getItem(START_DATE_KEY);

        const savedHour = await AsyncStorage.getItem(REMINDER_HOUR_KEY);

        const savedMinute = await AsyncStorage.getItem(REMINDER_MINUTE_KEY);

        const savedNotifications = await AsyncStorage.getItem(
          NOTIFICATIONS_ENABLED_KEY,
        );

        if (savedStartDate) {
          const parsed = new Date(`${savedStartDate}T00:00:00`);

          if (!Number.isNaN(parsed.getTime())) {
            setStartDate(parsed);
          }
        }

        if (savedHour !== null && savedMinute !== null) {
          const hour = Number(savedHour);
          const minute = Number(savedMinute);

          if (Number.isFinite(hour) && Number.isFinite(minute)) {
            setReminderTimeState(new Date(2000, 0, 1, hour, minute, 0, 0));
          }
        }

        setNotificationsEnabled(savedNotifications === "true");
      } catch (error) {
        console.log("Failed to load onboarding settings:", error);
      }
    }

    void loadSettings();
  }, [isReset, today]);

  function formatDate(date: Date) {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function saveSettings() {
    try {
      const year = startDate.getFullYear();

      const month = String(startDate.getMonth() + 1).padStart(2, "0");

      const day = String(startDate.getDate()).padStart(2, "0");

      const localStartDate = `${year}-${month}-${day}`;

      const reminderHour = reminderTime.getHours();

      const reminderMinute = reminderTime.getMinutes();

      await AsyncStorage.multiSet([
        [START_DATE_KEY, localStartDate],
        [NOTIFICATIONS_ENABLED_KEY, String(notificationsEnabled)],
        [REMINDER_HOUR_KEY, String(reminderHour)],
        [REMINDER_MINUTE_KEY, String(reminderMinute)],
        [
          REMINDER_TIME_KEY,
          JSON.stringify({
            hour: reminderHour,
            minute: reminderMinute,
          }),
        ],
        [ONBOARDING_COMPLETED_KEY, "true"],
      ]);

      await saveReminderTime({
        hour: reminderHour,
        minute: reminderMinute,
      });

      if (notificationsEnabled) {
        await scheduleDailyReadingNotifications();
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (error) {
      console.log("Failed to save onboarding settings:", error);
    }
  }

  async function toggleNotifications() {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();

      if (!granted) {
        Alert.alert(
          "Notifications",
          "Notification permission was not granted. You can enable notifications later in Settings.",
        );

        return;
      }

      setNotificationsEnabled(true);

      return;
    }

    setNotificationsEnabled(false);

    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  function skipNotifications() {
    setNotificationsEnabled(false);

    void Notifications.cancelAllScheduledNotificationsAsync();

    setStep((current) => current + 1);
  }

  function handleStartDateChange(_event: unknown, selected?: Date) {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
    }

    if (!selected) {
      return;
    }

    selected.setHours(0, 0, 0, 0);

    setStartDate(selected);
  }

  function handleReminderChange(_event: unknown, selected?: Date) {
    if (Platform.OS === "android") {
      setShowReminderPicker(false);
    }

    if (!selected) {
      return;
    }

    setReminderTimeState(
      new Date(2000, 0, 1, selected.getHours(), selected.getMinutes(), 0, 0),
    );
  }

  async function handleContinue() {
    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);

      return;
    }

    await saveSettings();

    router.replace("/");
  }

  function handleBack() {
    if (step > 0) {
      setStep((current) => current - 1);
    }
  }

  function renderBrand() {
    return (
      <View style={styles.brandContainer}>
        <View
          style={[
            styles.brandIcon,
            {
              backgroundColor: isNight
                ? "rgba(255,255,255,0.07)"
                : "rgba(255,255,255,0.58)",
              borderColor: isNight
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.84)",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="book-open-variant"
            size={22}
            color={fontColor}
          />
        </View>

        <Text
          style={[
            styles.brandText,
            {
              color: fontColor,
            },
          ]}
        >
          BIBLE JOURNEY
        </Text>
      </View>
    );
  }

  function renderProgress() {
    const progress = ((step + 1) / TOTAL_STEPS) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text
            style={[
              styles.progressLabel,
              {
                color: isNight
                  ? "rgba(255,255,255,0.42)"
                  : "rgba(24,24,24,0.42)",
              },
            ]}
          >
            YOUR JOURNEY
          </Text>

          <Text
            style={[
              styles.progressNumber,
              {
                color: fontColor,
              },
            ]}
          >
            {String(step + 1).padStart(2, "0")}
            {" / "}
            {String(TOTAL_STEPS).padStart(2, "0")}
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: isNight
                ? "rgba(255,255,255,0.09)"
                : "rgba(24,24,24,0.08)",
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: fontColor,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  function renderWelcome() {
    return (
      <View style={styles.stepContainer}>
        <View
          style={[
            styles.heroOuter,
            {
              backgroundColor: isNight
                ? "rgba(131,100,211,0.14)"
                : "rgba(164,190,240,0.20)",
            },
          ]}
        >
          <View
            style={[
              styles.heroInner,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.58)",
                borderColor: isNight
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.82)",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="book-open-variant"
              size={42}
              color={fontColor}
            />
          </View>
        </View>

        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          A YEAR IN THE WORD
        </Text>

        <Text
          style={[
            styles.mainTitle,
            {
              color: fontColor,
            },
          ]}
        >
          Welcome to{"\n"}
          Bible Journey
        </Text>

        <View
          style={[
            styles.titleLine,
            {
              backgroundColor: fontColor,
            },
          ]}
        />

        <Text
          style={[
            styles.bodyText,
            styles.centerText,
            {
              color: fontColor,
            },
          ]}
        >
          We should not think that reading through the Bible within a year is a
          difficult task or that we are too busy to do so. Brother Lee assures
          us that “if we genuinely desire to do this, we can do it,” and he
          exhorts us to “make a commitment before the Lord” to read the Bible
          every day for our whole life (CWWL, 1985, vol. 5, “All Saints Speaking
          for the Lord—The Normal Way to Meet and Increase,” p. 294).
        </Text>
      </View>
    );
  }

  function renderHowItWorks() {
    return (
      <View style={styles.stepContainer}>
        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          YOUR JOURNEY
        </Text>

        <Text
          style={[
            styles.stepTitle,
            {
              color: fontColor,
            },
          ]}
        >
          How Bible Journey Works
        </Text>

        <Text
          style={[
            styles.bodyText,
            styles.centerText,
            {
              color: fontColor,
            },
          ]}
        >
          It must be our habit that we prayerfully read the Bible day by day to
          inhale what God has breathed out.
        </Text>

        <GlassCard intensity={48} style={styles.glassCard}>
          <JourneyStep
            icon="book-open-variant"
            title="Read"
            description="Read your assigned Bible chapters each day."
            fontColor={fontColor}
            isNight={isNight}
          />

          <View
            style={[
              styles.journeyDivider,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.09)"
                  : "rgba(24,24,24,0.08)",
              },
            ]}
          />

          <JourneyStep
            icon="check-circle-outline"
            title="Complete"
            description="Mark your daily reading as completed."
            fontColor={fontColor}
            isNight={isNight}
          />

          <View
            style={[
              styles.journeyDivider,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.09)"
                  : "rgba(24,24,24,0.08)",
              },
            ]}
          />

          <JourneyStep
            icon="chart-line"
            title="Track"
            description="Follow your progress, history, and reading streaks."
            fontColor={fontColor}
            isNight={isNight}
          />

          <View
            style={[
              styles.journeyDivider,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.09)"
                  : "rgba(24,24,24,0.08)",
              },
            ]}
          />

          <JourneyStep
            icon="refresh"
            title="Continue"
            description="Return each day and keep moving forward."
            fontColor={fontColor}
            isNight={isNight}
            last
          />
        </GlassCard>
      </View>
    );
  }

  function renderAppearance() {
    return (
      <View style={styles.stepContainer}>
        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          PERSONALIZE
        </Text>

        <Text
          style={[
            styles.stepTitle,
            {
              color: fontColor,
            },
          ]}
        >
          Appearance
        </Text>

        <Text
          style={[
            styles.bodyText,
            styles.centerText,
            {
              color: fontColor,
            },
          ]}
        >
          Choose the look and feel that makes your time in the Word comfortable
          and focused.
        </Text>

        <GlassCard intensity={48} style={styles.glassCard}>
          <Text
            style={[
              styles.cardTitle,
              {
                color: fontColor,
              },
            ]}
          >
            Display Mode
          </Text>

          <View style={styles.horizontalOptions}>
            {DISPLAY_MODES.map(({ mode, label }) => {
              const selected = themeMode === mode;

              return (
                <Pressable
                  key={mode}
                  onPress={() => void setThemeMode(mode)}
                  style={[
                    styles.modeButton,
                    {
                      borderColor: selected
                        ? fontColor
                        : "rgba(128,128,128,0.24)",
                      backgroundColor: selected
                        ? `${fontColor}16`
                        : "transparent",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      mode === "day"
                        ? "white-balance-sunny"
                        : "moon-waning-crescent"
                    }
                    size={18}
                    color={fontColor}
                  />

                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: fontColor,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              styles.cardTitle,
              styles.cardTitleSpacing,
              {
                color: fontColor,
              },
            ]}
          >
            Font Color
          </Text>

          <View style={styles.colorGrid}>
            {(Object.keys(FONT_COLORS) as FontColor[]).map((name) => {
              // ThemeContext exposes the actual color as `fontColor`,
              // not a `fontColorName` property.
              const selected = FONT_COLORS[name] === fontColor;

              return (
                <Pressable
                  key={name}
                  onPress={() => void setFontColor(name)}
                  style={[
                    styles.colorButton,
                    {
                      borderColor: selected
                        ? FONT_COLORS[name]
                        : "rgba(128,128,128,0.24)",
                      backgroundColor: selected
                        ? `${FONT_COLORS[name]}14`
                        : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: FONT_COLORS[name],
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: fontColor,
                      },
                    ]}
                  >
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </Text>

                  {selected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={fontColor}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      </View>
    );
  }

  function renderStartDate() {
    return (
      <View style={styles.stepContainer}>
        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          BEGINNING
        </Text>

        <Text
          style={[
            styles.stepTitle,
            {
              color: fontColor,
            },
          ]}
        >
          Start Date
        </Text>

        <Text
          style={[
            styles.bodyText,
            styles.centerText,
            {
              color: fontColor,
            },
          ]}
        >
          Choose the date when you want to begin your one-year Bible reading
          journey.
        </Text>

        <GlassCard intensity={48} style={styles.glassCard}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.48)",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-start"
              size={24}
              color={fontColor}
            />
          </View>

          <Text
            style={[
              styles.cardTitle,
              {
                color: fontColor,
              },
            ]}
          >
            Your Journey Begins
          </Text>

          <Pressable
            onPress={() => setShowStartDatePicker(true)}
            style={[
              styles.dateButton,
              {
                borderColor: isNight
                  ? "rgba(255,255,255,0.13)"
                  : "rgba(24,24,24,0.11)",
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.035)"
                  : "rgba(255,255,255,0.35)",
              },
            ]}
          >
            <Text
              style={[
                styles.smallLabel,
                {
                  color: isNight
                    ? "rgba(255,255,255,0.40)"
                    : "rgba(24,24,24,0.42)",
                },
              ]}
            >
              START DATE
            </Text>

            <Text
              style={[
                styles.dateText,
                {
                  color: fontColor,
                },
              ]}
            >
              {formatDate(startDate)}
            </Text>
          </Pressable>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              maximumDate={today}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleStartDateChange}
            />
          )}

          {Platform.OS === "ios" && showStartDatePicker && (
            <Pressable
              onPress={() => setShowStartDatePicker(false)}
              style={styles.doneButton}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Done
              </Text>
            </Pressable>
          )}
        </GlassCard>
      </View>
    );
  }

  function renderDailyReminder() {
    return (
      <View style={styles.stepContainer}>
        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          DAILY RHYTHM
        </Text>

        <Text
          style={[
            styles.stepTitle,
            {
              color: fontColor,
            },
          ]}
        >
          Daily Reminder
        </Text>

        <Text
          style={[
            styles.bodyText,
            styles.centerText,
            {
              color: fontColor,
            },
          ]}
        >
          In our daily living we should have a time to read the Bible. We should
          not consider reading the Bible as a pastime or think that other things
          are more important. Reading the Bible is indispensable and cannot be
          put aside. We must keep the time to read our Bible.
        </Text>

        <GlassCard intensity={48} style={styles.glassCard}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.48)",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color={fontColor}
            />
          </View>

          <Text
            style={[
              styles.cardTitle,
              {
                color: fontColor,
              },
            ]}
          >
            Set Your Reading Time
          </Text>

          <Pressable
            onPress={() => setShowReminderPicker(true)}
            style={[
              styles.dateButton,
              {
                borderColor: isNight
                  ? "rgba(255,255,255,0.13)"
                  : "rgba(24,24,24,0.11)",
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.035)"
                  : "rgba(255,255,255,0.35)",
              },
            ]}
          >
            <Text
              style={[
                styles.smallLabel,
                {
                  color: isNight
                    ? "rgba(255,255,255,0.40)"
                    : "rgba(24,24,24,0.42)",
                },
              ]}
            >
              DAILY REMINDER
            </Text>

            <Text
              style={[
                styles.dateText,
                {
                  color: fontColor,
                },
              ]}
            >
              {formatTime(reminderTime)}
            </Text>
          </Pressable>

          {showReminderPicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleReminderChange}
            />
          )}

          {Platform.OS === "ios" && showReminderPicker && (
            <Pressable
              onPress={() => setShowReminderPicker(false)}
              style={styles.doneButton}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Done
              </Text>
            </Pressable>
          )}
        </GlassCard>
      </View>
    );
  }

  function renderNotifications() {
    return (
      <View style={styles.stepContainer}>
        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          STAY CONSISTENT
        </Text>

        <Text
          style={[
            styles.stepTitle,
            {
              color: fontColor,
            },
          ]}
        >
          Notifications
        </Text>

        <Text
          style={[
            styles.bodyText,
            styles.centerText,
            {
              color: fontColor,
            },
          ]}
        >
          Just as eating is a necessity in our physical life, reading the Bible
          is a necessity in our spiritual life. We need to read the Bible not
          because we have the formal obligation to do so but because our
          spiritual life and health depend on it.
        </Text>

        <GlassCard intensity={48} style={styles.glassCard}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.48)",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={notificationsEnabled ? "bell-ring-outline" : "bell-outline"}
              size={24}
              color={fontColor}
            />
          </View>

          <Text
            style={[
              styles.cardTitle,
              {
                color: fontColor,
              },
            ]}
          >
            Daily Reading Notifications
          </Text>

          <Text
            style={[
              styles.cardDescription,
              {
                color: isNight
                  ? "rgba(255,255,255,0.48)"
                  : "rgba(24,24,24,0.48)",
              },
            ]}
          >
            Receive a gentle reminder at your chosen reading time.
          </Text>

          <Pressable
            onPress={() => void toggleNotifications()}
            style={[
              styles.notificationButton,
              {
                borderColor: fontColor,
                backgroundColor: notificationsEnabled
                  ? fontColor
                  : "transparent",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={
                notificationsEnabled
                  ? "bell-check-outline"
                  : "bell-plus-outline"
              }
              size={19}
              color={
                notificationsEnabled
                  ? isNight
                    ? "#090B14"
                    : "#FFFFFF"
                  : fontColor
              }
            />

            <Text
              style={[
                styles.notificationText,
                {
                  color: notificationsEnabled
                    ? isNight
                      ? "#090B14"
                      : "#FFFFFF"
                    : fontColor,
                },
              ]}
            >
              {notificationsEnabled
                ? "Notifications Enabled"
                : "Enable Notifications"}
            </Text>
          </Pressable>

          <Pressable onPress={skipNotifications} style={styles.skipButton}>
            <Text
              style={[
                styles.skipText,
                {
                  color: isNight
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(24,24,24,0.52)",
                },
              ]}
            >
              Skip for now
            </Text>
          </Pressable>
        </GlassCard>
      </View>
    );
  }

  function renderComplete() {
    return (
      <View style={styles.stepContainer}>
        <View
          style={[
            styles.completeIcon,
            {
              backgroundColor: isNight
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.56)",
              borderColor: isNight
                ? "rgba(255,255,255,0.13)"
                : "rgba(255,255,255,0.82)",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="book-check-outline"
            size={34}
            color={fontColor}
          />
        </View>

        <Text
          style={[
            styles.eyebrow,
            {
              color: isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          READY TO BEGIN
        </Text>

        <Text
          style={[
            styles.completeTitle,
            {
              color: fontColor,
            },
          ]}
        >
          May the Lord impress us with the importance of reading His Word, and
          may He bring us into the habit of spending time in His Word every day!
        </Text>

        <GlassCard intensity={48} style={styles.glassCard}>
          <Text
            style={[
              styles.cardTitle,
              {
                color: fontColor,
              },
            ]}
          >
            Customize Bible Journey
          </Text>

          <View style={styles.summaryDivider} />

          <SummaryItem
            icon="theme-light-dark"
            label="Appearance"
            value={themeMode === "night" ? "Night Mode" : "Day Mode"}
            fontColor={fontColor}
            isNight={isNight}
          />

          <SummaryItem
            icon="calendar-start"
            label="Start Date"
            value={formatDate(startDate)}
            fontColor={fontColor}
            isNight={isNight}
          />

          <SummaryItem
            icon="bell-outline"
            label="Notifications"
            value={notificationsEnabled ? "Enabled" : "Disabled"}
            fontColor={fontColor}
            isNight={isNight}
          />

          <SummaryItem
            icon="clock-outline"
            label="Daily Reminder"
            value={formatTime(reminderTime)}
            fontColor={fontColor}
            isNight={isNight}
            last
          />
        </GlassCard>
      </View>
    );
  }

  function renderCurrentStep() {
    switch (step) {
      case 0:
        return renderWelcome();

      case 1:
        return renderHowItWorks();

      case 2:
        return renderAppearance();

      case 3:
        return renderStartDate();

      case 4:
        return renderDailyReminder();

      case 5:
        return renderNotifications();

      default:
        return renderComplete();
    }
  }

  return (
    <ScreenBackground>
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderBrand()}
          {renderProgress()}
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.bottomControls}>
          {step > 0 ? (
            <Pressable
              onPress={handleBack}
              style={[
                styles.backButton,
                {
                  borderColor: isNight
                    ? "rgba(255,255,255,0.13)"
                    : "rgba(24,24,24,0.11)",
                  backgroundColor: isNight
                    ? "rgba(255,255,255,0.035)"
                    : "rgba(255,255,255,0.42)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={18}
                color={fontColor}
              />

              <Text
                style={[
                  styles.backText,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Back
              </Text>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <Pressable
            onPress={() => void handleContinue()}
            style={[
              styles.continueButton,
              {
                backgroundColor: fontColor,
                shadowColor: fontColor,
              },
            ]}
          >
            <Text style={styles.continueText}>
              {step === TOTAL_STEPS - 1 ? "Begin Journey" : "Continue"}
            </Text>

            <MaterialCommunityIcons
              name={step === TOTAL_STEPS - 1 ? "arrow-right" : "chevron-right"}
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}

function JourneyStep({
  icon,
  title,
  description,
  fontColor,
  isNight,
  last = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  description: string;
  fontColor: string;
  isNight: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.journeyStep, last && styles.lastJourneyStep]}>
      <View
        style={[
          styles.journeyIcon,
          {
            backgroundColor: isNight
              ? "rgba(255,255,255,0.055)"
              : "rgba(255,255,255,0.45)",
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={fontColor} />
      </View>

      <View style={styles.journeyContent}>
        <Text
          style={[
            styles.journeyTitle,
            {
              color: fontColor,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.journeyDescription,
            {
              color: isNight ? "rgba(255,255,255,0.48)" : "rgba(24,24,24,0.48)",
            },
          ]}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  fontColor,
  isNight,
  last = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  fontColor: string;
  isNight: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryItem, last && styles.lastSummaryItem]}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: isNight
              ? "rgba(255,255,255,0.055)"
              : "rgba(255,255,255,0.45)",
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={18} color={fontColor} />
      </View>

      <View style={styles.summaryContent}>
        <Text
          style={[
            styles.summaryLabel,
            {
              color: isNight ? "rgba(255,255,255,0.40)" : "rgba(24,24,24,0.42)",
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.summaryValue,
            {
              color: fontColor,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 150,
  },

  brandContainer: {
    alignItems: "center",
    marginBottom: 22,
  },

  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  brandText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.1,
  },

  progressContainer: {
    width: "100%",
    marginBottom: 34,
  },

  progressHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  progressLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
  },

  progressNumber: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  stepContainer: {
    width: "100%",
    alignItems: "center",
  },

  heroOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  heroInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  eyebrow: {
    width: "100%",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },

  mainTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  titleLine: {
    width: 32,
    height: 3,
    borderRadius: 999,
    marginVertical: 19,
  },

  stepTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 29,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 13,
  },

  completeTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 23,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 25,
  },

  bodyText: {
    width: "100%",
    fontSize: 15.5,
    lineHeight: 26,
    marginBottom: 26,
  },

  centerText: {
    textAlign: "center",
  },

  glassCard: {
    width: "100%",
    padding: 22,
    alignItems: "center",
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 13,
  },

  cardTitle: {
    width: "100%",
    textAlign: "center",
    alignSelf: "center",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    marginBottom: 14,
  },

  cardTitleSpacing: {
    marginTop: 23,
  },

  horizontalOptions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },

  modeButton: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  optionText: {
    textAlign: "center",
    fontSize: 13.5,
    fontWeight: "700",
  },

  colorGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },

  colorButton: {
    width: "46%",
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  colorDot: {
    width: 13,
    height: 13,
    borderRadius: 99,
  },

  dateButton: {
    width: "100%",
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  smallLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: "center",
  },

  dateText: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    textAlign: "center",
  },

  doneButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },

  doneButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  cardDescription: {
    width: "100%",
    textAlign: "center",
    alignSelf: "center",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },

  notificationButton: {
    width: "100%",
    minHeight: 55,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  notificationText: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  skipButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  skipText: {
    fontSize: 12.5,
    fontWeight: "700",
  },

  journeyStep: {
    width: "100%",
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
  },

  lastJourneyStep: {
    marginBottom: 0,
  },

  journeyIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    flexShrink: 0,
  },

  journeyContent: {
    flex: 1,
    minWidth: 0,
  },

  journeyTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 2,
  },

  journeyDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },

  journeyDivider: {
    width: "100%",
    height: 1,
    marginVertical: 4,
  },

  completeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  summaryDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(128,128,128,0.11)",
    marginBottom: 8,
  },

  summaryItem: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  lastSummaryItem: {
    marginBottom: 0,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  summaryValue: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "700",
  },

  bottomControls: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 22,
    flexDirection: "row",
    gap: 11,
  },

  backPlaceholder: {
    flex: 0.82,
  },

  backButton: {
    flex: 0.82,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },

  backText: {
    fontSize: 14,
    fontWeight: "800",
  },

  continueButton: {
    flex: 1.35,
    minHeight: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
    textAlign: "center",
  },
});
