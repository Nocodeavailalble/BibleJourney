import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";
import { FONT_COLORS, useTheme, type FontColor } from "../theme/ThemeContext";
import {
  getSecondReminderEnabled,
  getSecondReminderTime,
  saveSecondReminderTime,
  scheduleDailyReadingNotifications,
  setSecondReminderEnabled,
} from "../utils/notifications";

const COMPLETED_DAYS_KEY = "completedDays";
const CHAPTER_PROGRESS_KEY = "chapterProgress";
const START_DATE_KEY = "startDate";
const NOTIFICATIONS_ENABLED_KEY = "notificationsEnabled";
const REMINDER_HOUR_KEY = "reminderHour";
const REMINDER_MINUTE_KEY = "reminderMinute";
const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";
const APP_VERSION = "1.0.0";

function HapticPressable(props: React.ComponentProps<typeof Pressable>) {
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

export default function SettingsScreen() {
  const { fontColor, themeMode, setFontColor, setThemeMode } = useTheme();

  const isNight = themeMode === "night";

  const secondary = isNight ? "rgba(255,255,255,0.58)" : "rgba(24,24,24,0.58)";

  const muted = isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)";

  const surface = isNight ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.58)";

  const border = isNight ? "rgba(255,255,255,0.13)" : "rgba(24,24,24,0.10)";

  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);

  const [reminderTime, setReminderTime] = useState(
    new Date(2000, 0, 1, 20, 0, 0, 0),
  );

  const [secondReminderEnabled, setSecondReminderEnabledState] =
    useState(false);

  const [secondReminderTime, setSecondReminderTimeState] = useState(
    new Date(2000, 0, 1, 21, 30, 0, 0),
  );

  const [startDate, setStartDate] = useState<Date | null>(null);

  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showSecondTimePicker, setShowSecondTimePicker] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [enabled, hour, minute, savedStart, secondEnabled, secondTime] =
          await Promise.all([
            AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
            AsyncStorage.getItem(REMINDER_HOUR_KEY),
            AsyncStorage.getItem(REMINDER_MINUTE_KEY),
            AsyncStorage.getItem(START_DATE_KEY),
            getSecondReminderEnabled(),
            getSecondReminderTime(),
          ]);

        setNotificationsEnabledState(enabled === "true");

        const h = hour === null ? 20 : Number(hour);

        const m = minute === null ? 0 : Number(minute);

        setReminderTime(
          new Date(
            2000,
            0,
            1,
            Number.isInteger(h) ? h : 20,
            Number.isInteger(m) ? m : 0,
            0,
            0,
          ),
        );

        setSecondReminderEnabledState(secondEnabled);

        setSecondReminderTimeState(
          new Date(2000, 0, 1, secondTime.hour, secondTime.minute, 0, 0),
        );

        if (savedStart) {
          const parsed = new Date(savedStart);

          if (!Number.isNaN(parsed.getTime())) {
            setStartDate(parsed);
          }
        }
      } catch (error) {
        console.log("Failed to load settings:", error);
      }
    }

    void load();
  }, []);

  function formatDate(value: Date | null) {
    return value
      ? value.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Not set";
  }

  function formatTime(value: Date) {
    return value.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function requestPermission() {
    const current = await Notifications.getPermissionsAsync();

    if (current.status === "granted") {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync();

    return requested.status === "granted";
  }

  async function refreshNotifications() {
    try {
      await scheduleDailyReadingNotifications();
    } catch (error) {
      console.log("Failed to schedule notifications:", error);
    }
  }

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      setNotificationsEnabledState(false);

      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");

      await Notifications.cancelAllScheduledNotificationsAsync();

      return;
    }

    try {
      const granted = await requestPermission();

      if (!granted) {
        setNotificationsEnabledState(false);

        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");

        Alert.alert(
          "Notifications unavailable",
          "Please allow notifications in your device settings.",
        );

        return;
      }

      setNotificationsEnabledState(true);

      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");

      await refreshNotifications();
    } catch (error) {
      console.log("Failed to enable notifications:", error);

      setNotificationsEnabledState(false);

      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
    }
  }

  async function toggleSecondReminder(enabled: boolean) {
    try {
      setSecondReminderEnabledState(enabled);

      await setSecondReminderEnabled(enabled);

      if (notificationsEnabled) {
        await refreshNotifications();
      }
    } catch (error) {
      console.log("Failed to update second reminder:", error);
    }
  }

  async function changeTime(_event: unknown, selected?: Date) {
    setShowTimePicker(false);

    if (!selected) {
      return;
    }

    setReminderTime(selected);

    await AsyncStorage.setItem(
      REMINDER_HOUR_KEY,
      selected.getHours().toString(),
    );

    await AsyncStorage.setItem(
      REMINDER_MINUTE_KEY,
      selected.getMinutes().toString(),
    );

    await AsyncStorage.setItem(
      "reminderTime",
      JSON.stringify({
        hour: selected.getHours(),
        minute: selected.getMinutes(),
      }),
    );

    if (notificationsEnabled) {
      await refreshNotifications();
    }
  }

  async function changeSecondReminderTime(_event: unknown, selected?: Date) {
    setShowSecondTimePicker(false);

    if (!selected) {
      return;
    }

    setSecondReminderTimeState(selected);

    await saveSecondReminderTime({
      hour: selected.getHours(),
      minute: selected.getMinutes(),
    });

    if (notificationsEnabled) {
      await refreshNotifications();
    }
  }

  async function changeStartDate(_event: unknown, selected?: Date) {
    setShowDatePicker(false);

    if (!selected) {
      return;
    }

    setStartDate(selected);

    await AsyncStorage.setItem(START_DATE_KEY, selected.toISOString());

    if (notificationsEnabled) {
      await refreshNotifications();
    }
  }

  function confirmReset() {
    Alert.alert(
      "Reset Bible Journey?",
      "This will erase your reading progress, start date, reminder settings, and onboarding status. You will be taken back to the beginning of onboarding.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => void performReset(),
        },
      ],
    );
  }

  async function performReset() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      await AsyncStorage.multiRemove([
        COMPLETED_DAYS_KEY,
        CHAPTER_PROGRESS_KEY,
        START_DATE_KEY,
        NOTIFICATIONS_ENABLED_KEY,
        REMINDER_HOUR_KEY,
        REMINDER_MINUTE_KEY,
        "reminderTime",
        "scheduledNotificationIds",
        "secondReminderEnabled",
        "secondReminderHour",
        "secondReminderMinute",
        "secondReminderTime",
        "scheduledSecondNotificationIds",
        ONBOARDING_COMPLETED_KEY,
      ]);

      setNotificationsEnabledState(false);
      setSecondReminderEnabledState(false);
      setStartDate(null);

      setReminderTime(new Date(2000, 0, 1, 20, 0, 0, 0));

      setSecondReminderTimeState(new Date(2000, 0, 1, 21, 30, 0, 0));

      router.replace({
        pathname: "/onboarding",
        params: {
          reset: "true",
        },
      });
    } catch (error) {
      console.log("Failed to reset Bible Journey:", error);

      Alert.alert(
        "Reset failed",
        "Your Bible Journey could not be reset. Please try again.",
      );
    }
  }

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: fontColor,
              },
            ]}
          >
            Settings
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: secondary,
              },
            ]}
          >
            Personalize your Bible Journey
          </Text>
        </View>

        {/* READING */}
        <Text
          style={[
            styles.section,
            {
              color: fontColor,
            },
          ]}
        >
          Reading
        </Text>

        <GlassCard intensity={45} style={styles.card}>
          <HapticPressable
            onPress={() => setShowDatePicker(true)}
            style={styles.row}
          >
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="calendar-start"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Start date
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                {formatDate(startDate)}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={muted}
            />
          </HapticPressable>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Reading plan
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                One year (365 days)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <HapticPressable onPress={confirmReset} style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="restart"
                size={21}
                color="#C94343"
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: "#C94343",
                  },
                ]}
              >
                Reset journey
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                Erase your progress and start again
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#C94343"
            />
          </HapticPressable>
        </GlassCard>

        {showDatePicker && (
          <DateTimePicker
            value={startDate ?? new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={changeStartDate}
          />
        )}

        {/* NOTIFICATIONS */}
        <Text
          style={[
            styles.section,
            {
              color: fontColor,
            },
          ]}
        >
          Notifications
        </Text>

        <GlassCard intensity={45} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Daily reminder
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                Receive a reminder for your daily reading
              </Text>
            </View>

            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => {
                void Haptics.selectionAsync();
                void toggleNotifications(value);
              }}
              trackColor={{
                false: "rgba(128,128,128,0.18)",
                true: fontColor,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <HapticPressable
            onPress={() => setShowTimePicker(true)}
            style={styles.row}
          >
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Reminder time
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                {formatTime(reminderTime)}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={muted}
            />
          </HapticPressable>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="bell-plus-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Second reminder
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                A second reminder if you still have not finished
              </Text>
            </View>

            <Switch
              value={secondReminderEnabled}
              onValueChange={(value) => {
                void Haptics.selectionAsync();
                void toggleSecondReminder(value);
              }}
              trackColor={{
                false: "rgba(128,128,128,0.18)",
                true: fontColor,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <HapticPressable
            onPress={() => setShowSecondTimePicker(true)}
            style={styles.row}
          >
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Second reminder time
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                {formatTime(secondReminderTime)}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={muted}
            />
          </HapticPressable>
        </GlassCard>

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            display="default"
            onChange={changeTime}
          />
        )}

        {showSecondTimePicker && (
          <DateTimePicker
            value={secondReminderTime}
            mode="time"
            display="default"
            onChange={changeSecondReminderTime}
          />
        )}

        {/* APPEARANCE */}
        <Text
          style={[
            styles.section,
            {
              color: fontColor,
            },
          ]}
        >
          Appearance
        </Text>

        <GlassCard intensity={45} style={styles.card}>
          <Text
            style={[
              styles.label,
              {
                color: secondary,
              },
            ]}
          >
            DAY / NIGHT
          </Text>

          <View style={styles.segmented}>
            <HapticPressable
              onPress={() => void setThemeMode("day")}
              style={[
                styles.segment,
                {
                  backgroundColor: themeMode === "day" ? fontColor : surface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="weather-sunny"
                size={17}
                color={themeMode === "day" ? "#FFFFFF" : secondary}
              />

              <Text
                style={[
                  styles.segmentText,
                  {
                    color: themeMode === "day" ? "#FFFFFF" : secondary,
                  },
                ]}
              >
                Day
              </Text>
            </HapticPressable>

            <HapticPressable
              onPress={() => void setThemeMode("night")}
              style={[
                styles.segment,
                {
                  backgroundColor: themeMode === "night" ? fontColor : surface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="weather-night"
                size={17}
                color={themeMode === "night" ? "#FFFFFF" : secondary}
              />

              <Text
                style={[
                  styles.segmentText,
                  {
                    color: themeMode === "night" ? "#FFFFFF" : secondary,
                  },
                ]}
              >
                Night
              </Text>
            </HapticPressable>
          </View>

          <View style={styles.divider} />

          <Text
            style={[
              styles.label,
              {
                color: secondary,
              },
            ]}
          >
            FONT / ACCENT COLOR
          </Text>

          <View style={styles.colors}>
            {(Object.keys(FONT_COLORS) as FontColor[]).map((name) => {
              /*
               * ThemeContext exposes fontColor, not fontColorName.
               * Therefore determine the selected color by
               * comparing the stored color value.
               */
              const selected = fontColor === FONT_COLORS[name];

              return (
                <HapticPressable
                  key={name}
                  onPress={() => void setFontColor(name)}
                  style={[
                    styles.colorOption,
                    {
                      borderColor: selected ? fontColor : border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.circle,
                      {
                        backgroundColor: FONT_COLORS[name],
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.colorName,
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
                      size={17}
                      color={FONT_COLORS[name]}
                      style={styles.colorCheck}
                    />
                  )}
                </HapticPressable>
              );
            })}
          </View>
        </GlassCard>

        {/* DATA */}
        <Text
          style={[
            styles.section,
            {
              color: fontColor,
            },
          ]}
        >
          Data
        </Text>

        <GlassCard intensity={45} style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons
                name="database-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Your data
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                Your reading progress, preferences, and streak history are
                stored on your device.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {[
            ["cloud-outline", "Backup", "Coming soon"],
            ["export-variant", "Export Data", "Coming soon"],
            ["import", "Import Data", "Coming soon"],
          ].map(([icon, title, desc]) => (
            <View key={title} style={styles.row}>
              <View style={styles.icon}>
                <MaterialCommunityIcons
                  name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={21}
                  color={muted}
                />
              </View>

              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.rowTitle,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  {title}
                </Text>

                <Text
                  style={[
                    styles.rowDesc,
                    {
                      color: secondary,
                    },
                  ]}
                >
                  {desc}
                </Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* ABOUT */}
        <Text
          style={[
            styles.section,
            {
              color: fontColor,
            },
          ]}
        >
          About
        </Text>

        <GlassCard intensity={45} style={styles.card}>
          <HapticPressable
            onPress={() => router.push("/about")}
            style={styles.row}
          >
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Bible Journey
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                Learn more about the app
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={muted}
            />
          </HapticPressable>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Version
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                {APP_VERSION}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name="account-heart-outline"
                size={21}
                color={fontColor}
              />
            </View>

            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Credits
              </Text>

              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: secondary,
                  },
                ]}
              >
                Bible Journey
              </Text>
            </View>
          </View>
        </GlassCard>

        <Text
          style={[
            styles.footer,
            {
              color: muted,
            },
          ]}
        >
          Eat, Digest and Assimilate Christ!
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 125,
  },

  header: {
    paddingTop: 8,
    marginBottom: 22,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },

  section: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 2,
  },

  card: {
    borderRadius: 22,
    padding: 7,
    marginBottom: 20,
  },

  row: {
    minHeight: 70,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  textWrap: {
    flex: 1,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  rowDesc: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },

  divider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: "rgba(128,128,128,0.13)",
  },

  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginHorizontal: 9,
    marginTop: 12,
    marginBottom: 9,
  },

  segmented: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 7,
  },

  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  segmentText: {
    fontSize: 12,
    fontWeight: "800",
  },

  colors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 7,
    paddingBottom: 8,
  },

  colorOption: {
    width: "48.5%",
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 9,
  },

  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  colorName: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },

  colorCheck: {
    marginLeft: 2,
  },

  infoRow: {
    minHeight: 82,
    paddingHorizontal: 9,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(128,128,128,0.09)",
  },

  footer: {
    textAlign: "center",
    fontSize: 10,
    marginTop: 2,
  },
});
