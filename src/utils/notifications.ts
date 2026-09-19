import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import readingPlan from "../constants/readingPlan";
import { FONT_COLORS, type FontColor } from "../theme/ThemeContext";

const START_DATE_KEY = "startDate";
const COMPLETED_DAYS_KEY = "completedDays";
const NOTIFICATIONS_ENABLED_KEY = "notificationsEnabled";
const REMINDER_TIME_KEY = "reminderTime";
const REMINDER_HOUR_KEY = "reminderHour";
const REMINDER_MINUTE_KEY = "reminderMinute";
const SECOND_REMINDER_ENABLED_KEY = "secondReminderEnabled";
const SECOND_REMINDER_HOUR_KEY = "secondReminderHour";
const SECOND_REMINDER_MINUTE_KEY = "secondReminderMinute";
const SECOND_REMINDER_TIME_KEY = "secondReminderTime";
const SCHEDULED_NOTIFICATION_IDS_KEY = "scheduledNotificationIds";
const SCHEDULED_SECOND_NOTIFICATION_IDS_KEY = "scheduledSecondNotificationIds";
const FONT_COLOR_KEY = "fontColor";

const MAX_IOS_SCHEDULED_DAYS = 50;
const MAX_ANDROID_SCHEDULED_DAYS = 365;
const DEFAULT_REMINDER = { hour: 20, minute: 0 };
const DEFAULT_SECOND_REMINDER = { hour: 21, minute: 30 };
const DEFAULT_NOTIFICATION_COLOR = FONT_COLORS.skyBlue;

export type ReminderTime = { hour: number; minute: number };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isValidTime(time: ReminderTime) {
  return (
    Number.isInteger(time.hour) &&
    time.hour >= 0 &&
    time.hour <= 23 &&
    Number.isInteger(time.minute) &&
    time.minute >= 0 &&
    time.minute <= 59
  );
}

function isValidFontColor(value: string): value is FontColor {
  return (
    value === "skyBlue" ||
    value === "warmOrange" ||
    value === "limeGold" ||
    value === "lightSilver" ||
    value === "forestGreen" ||
    value === "deepAzure"
  );
}

async function getNotificationColor() {
  const saved = await AsyncStorage.getItem(FONT_COLOR_KEY);
  return saved && isValidFontColor(saved)
    ? FONT_COLORS[saved]
    : DEFAULT_NOTIFICATION_COLOR;
}

async function ensureNotificationChannel() {
  if (Platform.OS !== "android") return;

  const color = await getNotificationColor();

  await Notifications.setNotificationChannelAsync("daily-reading", {
    name: "Bible Journey · Daily Word",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    vibrationPattern: [0, 220, 120, 220],
    lightColor: color,
    description: "Personal Bible reading reminders from Bible Journey.",
  });
}

function parseStorageDate(value: string) {
  const parts = value.split("-");
  if (parts.length !== 3) return new Date();

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return new Date();
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dateOnly(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    12,
    0,
    0,
    0,
  );
}

function planDayForDate(start: Date, target: Date) {
  return (
    Math.floor(
      (dateOnly(target).getTime() - dateOnly(start).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1
  );
}

async function getCompletedDays(): Promise<Set<number>> {
  const saved = await AsyncStorage.getItem(COMPLETED_DAYS_KEY);
  if (!saved) return new Set<number>();

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return new Set<number>();

    return new Set(
      parsed.filter(
        (day): day is number =>
          typeof day === "number" &&
          Number.isInteger(day) &&
          day >= 1 &&
          day <= 365,
      ),
    );
  } catch {
    return new Set<number>();
  }
}

async function getIds(key: string): Promise<string[]> {
  const saved = await AsyncStorage.getItem(key);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function cancelIds(key: string) {
  const ids = await getIds(key);

  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Ignore already-cancelled notifications.
      }
    }),
  );

  await AsyncStorage.removeItem(key);
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function getNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)) === "true";
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(
    NOTIFICATIONS_ENABLED_KEY,
    enabled ? "true" : "false",
  );

  if (!enabled) {
    await cancelDailyReadingNotifications();
  }
}

export async function getReminderTime(): Promise<ReminderTime> {
  const savedHour = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
  const savedMinute = await AsyncStorage.getItem(REMINDER_MINUTE_KEY);

  const time = {
    hour: savedHour === null ? DEFAULT_REMINDER.hour : Number(savedHour),
    minute:
      savedMinute === null ? DEFAULT_REMINDER.minute : Number(savedMinute),
  };

  if (isValidTime(time)) return time;

  const legacy = await AsyncStorage.getItem(REMINDER_TIME_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const fallback = {
        hour: Number(parsed?.hour),
        minute: Number(parsed?.minute),
      };
      if (isValidTime(fallback)) return fallback;
    } catch {
      // Use default.
    }
  }

  return DEFAULT_REMINDER;
}

export async function saveReminderTime(time: ReminderTime): Promise<void> {
  if (!isValidTime(time)) return;

  await AsyncStorage.setItem(REMINDER_HOUR_KEY, time.hour.toString());
  await AsyncStorage.setItem(REMINDER_MINUTE_KEY, time.minute.toString());
  await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify(time));
}

export async function getSecondReminderEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(SECOND_REMINDER_ENABLED_KEY)) === "true";
}

export async function setSecondReminderEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(
    SECOND_REMINDER_ENABLED_KEY,
    enabled ? "true" : "false",
  );

  if (!enabled) {
    await cancelSecondReminderNotifications();
  }
}

export async function getSecondReminderTime(): Promise<ReminderTime> {
  const savedHour = await AsyncStorage.getItem(SECOND_REMINDER_HOUR_KEY);
  const savedMinute = await AsyncStorage.getItem(SECOND_REMINDER_MINUTE_KEY);

  const time = {
    hour: savedHour === null ? DEFAULT_SECOND_REMINDER.hour : Number(savedHour),
    minute:
      savedMinute === null
        ? DEFAULT_SECOND_REMINDER.minute
        : Number(savedMinute),
  };

  if (isValidTime(time)) return time;

  const legacy = await AsyncStorage.getItem(SECOND_REMINDER_TIME_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const fallback = {
        hour: Number(parsed?.hour),
        minute: Number(parsed?.minute),
      };
      if (isValidTime(fallback)) return fallback;
    } catch {
      // Use default.
    }
  }

  return DEFAULT_SECOND_REMINDER;
}

export async function saveSecondReminderTime(
  time: ReminderTime,
): Promise<void> {
  if (!isValidTime(time)) return;

  await AsyncStorage.setItem(SECOND_REMINDER_HOUR_KEY, time.hour.toString());
  await AsyncStorage.setItem(
    SECOND_REMINDER_MINUTE_KEY,
    time.minute.toString(),
  );
  await AsyncStorage.setItem(SECOND_REMINDER_TIME_KEY, JSON.stringify(time));
}

export async function cancelDailyReadingNotifications(): Promise<void> {
  await cancelIds(SCHEDULED_NOTIFICATION_IDS_KEY);
  await cancelSecondReminderNotifications();
}

export async function cancelSecondReminderNotifications(): Promise<void> {
  await cancelIds(SCHEDULED_SECOND_NOTIFICATION_IDS_KEY);
}

export async function cancelScheduledNotifications(): Promise<void> {
  await cancelDailyReadingNotifications();
}

export async function scheduleDailyReadingNotifications(): Promise<void> {
  const startDateString = await AsyncStorage.getItem(START_DATE_KEY);
  if (!startDateString) return;
  if (!(await getNotificationsEnabled())) return;
  if (!(await requestNotificationPermission())) return;

  await cancelDailyReadingNotifications();

  const reminder = await getReminderTime();
  const secondReminderEnabled = await getSecondReminderEnabled();
  const secondReminder = await getSecondReminderTime();
  const notificationColor = await getNotificationColor();
  const completedDays = await getCompletedDays();
  const startDate = parseStorageDate(startDateString);
  const today = dateOnly(new Date());
  let firstDate = today;
  if (today.getTime() < startDate.getTime()) firstDate = startDate;

  const maxDays =
    Platform.OS === "ios" ? MAX_IOS_SCHEDULED_DAYS : MAX_ANDROID_SCHEDULED_DAYS;

  const dailyIds: string[] = [];
  const secondIds: string[] = [];

  for (let offset = 0; offset < maxDays; offset += 1) {
    const target = new Date(firstDate.getTime());
    target.setDate(firstDate.getDate() + offset);

    const planDay = planDayForDate(startDate, target);
    if (planDay < 1 || planDay > 365) break;

    const reading = readingPlan.find((item) => item.day === planDay);
    if (!reading || completedDays.has(planDay)) continue;

    let notificationDate = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      reminder.hour,
      reminder.minute,
      0,
      0,
    );

    if (notificationDate.getTime() <= Date.now()) {
      notificationDate.setDate(notificationDate.getDate() + 1);
    }

    const finalDay = planDayForDate(startDate, notificationDate);
    const finalReading = readingPlan.find((item) => item.day === finalDay);
    if (
      !finalReading ||
      finalDay < 1 ||
      finalDay > 365 ||
      completedDays.has(finalDay)
    ) {
      continue;
    }

    const dailyId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Bible Journey",
        subtitle: "DAILY WORD",
        body: `It’s time for your Bible reading.\nDay ${finalDay}  •  ${finalReading.reference}`,
        sound: "default",
        color: notificationColor,
        data: {
          url: `/reading?day=${finalDay}`,
          day: finalDay,
          type: "daily-reading",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
        channelId: "daily-reading",
      },
    });

    dailyIds.push(dailyId);

    if (secondReminderEnabled) {
      let secondDate = new Date(
        target.getFullYear(),
        target.getMonth(),
        target.getDate(),
        secondReminder.hour,
        secondReminder.minute,
        0,
        0,
      );

      if (secondDate.getTime() <= Date.now()) {
        secondDate.setDate(secondDate.getDate() + 1);
      }

      if (secondDate.getTime() <= notificationDate.getTime()) {
        secondDate.setDate(secondDate.getDate() + 1);
      }

      const secondFinalDay = planDayForDate(startDate, secondDate);
      const secondReading = readingPlan.find(
        (item) => item.day === secondFinalDay,
      );

      if (
        secondReading &&
        secondFinalDay >= 1 &&
        secondFinalDay <= 365 &&
        !completedDays.has(secondFinalDay)
      ) {
        const secondId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Bible Journey",
            subtitle: "KEEP GOING",
            body: `Your Bible Journey is waiting for you.\nDay ${secondFinalDay}  •  ${secondReading.reference}`,
            sound: "default",
            color: notificationColor,
            data: {
              url: `/reading?day=${secondFinalDay}`,
              day: secondFinalDay,
              type: "second-reminder",
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: secondDate,
            channelId: "daily-reading",
          },
        });

        secondIds.push(secondId);
      }
    }
  }

  await AsyncStorage.setItem(
    SCHEDULED_NOTIFICATION_IDS_KEY,
    JSON.stringify(dailyIds),
  );
  await AsyncStorage.setItem(
    SCHEDULED_SECOND_NOTIFICATION_IDS_KEY,
    JSON.stringify(secondIds),
  );
}

export async function rescheduleDailyReadingNotifications(): Promise<void> {
  if (!(await getNotificationsEnabled())) {
    await cancelDailyReadingNotifications();
    return;
  }

  await scheduleDailyReadingNotifications();
}

export async function refreshNotificationSchedule(): Promise<void> {
  await rescheduleDailyReadingNotifications();
}
