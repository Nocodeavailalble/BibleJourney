import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const FONT_COLORS = {
  forestGreen: "#228B22",
  skyBlue: "#4DA6FF",
  warmOrange: "#F39C12",
  limeGold: "#B7B51D",
  lightSilver: "#A9B0BA",
} as const;

export const DARKER_FONT_COLORS = {
  forestGreen: "#176B17",
  skyBlue: "#2F7FC4",
  warmOrange: "#C77D08",
  limeGold: "#858600",
  lightSilver: "#7C838D",
} as const;

export type FontColor = keyof typeof FONT_COLORS;
export type ThemeMode = "day" | "night";

type ThemeColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  icon: string;
  iconMuted: string;
  primary: string;
  primarySoft: string;
  shadow: string;
};

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;

  fontColor: string;
  fontColorKey: FontColor;
  setFontColor: (color: FontColor) => void;

  colors: ThemeColors;
  isNight: boolean;
};

const THEME_MODE_KEY = "themeMode";
const FONT_COLOR_KEY = "fontColor";

const DEFAULT_THEME_MODE: ThemeMode = "day";
const DEFAULT_FONT_COLOR: FontColor = "forestGreen";

const DAY_COLORS: ThemeColors = {
  background: "#F7F8F4",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F4EF",
  card: "#FFFFFF",
  text: "#182018",
  textSecondary: "#4D584D",
  textMuted: "#7B847B",
  border: "rgba(24,32,24,0.10)",
  divider: "rgba(24,32,24,0.08)",
  icon: "#263326",
  iconMuted: "#7B847B",
  primary: "#228B22",
  primarySoft: "rgba(34,139,34,0.12)",
  shadow: "#64748B",
};

const NIGHT_COLORS: ThemeColors = {
  background: "#080B18",
  surface: "#101426",
  surfaceSecondary: "#151A2D",
  card: "#11172A",
  text: "#F4F6FA",
  textSecondary: "#C0C6D4",
  textMuted: "#858DA0",
  border: "rgba(255,255,255,0.10)",
  divider: "rgba(255,255,255,0.08)",
  icon: "#F4F6FA",
  iconMuted: "#858DA0",
  primary: "#228B22",
  primarySoft: "rgba(34,139,34,0.18)",
  shadow: "#000000",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] =
    useState<ThemeMode>(DEFAULT_THEME_MODE);

  const [fontColorKey, setFontColorKey] =
    useState<FontColor>(DEFAULT_FONT_COLOR);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadThemeSettings() {
      try {
        const [savedMode, savedFontColor] = await Promise.all([
          AsyncStorage.getItem(THEME_MODE_KEY),
          AsyncStorage.getItem(FONT_COLOR_KEY),
        ]);

        let mode: ThemeMode = DEFAULT_THEME_MODE;

        if (savedMode === "day" || savedMode === "night") {
          mode = savedMode;
        }

        let color: FontColor = DEFAULT_FONT_COLOR;

        if (
          savedFontColor === "forestGreen" ||
          savedFontColor === "skyBlue" ||
          savedFontColor === "warmOrange" ||
          savedFontColor === "limeGold" ||
          savedFontColor === "lightSilver"
        ) {
          color = savedFontColor;
        } else {
          /*
           * Preserve compatibility with older saved color values.
           */
          const legacyColorMap: Record<string, FontColor> = {
            black: "forestGreen",
            gray: "warmOrange",
            grey: "warmOrange",
            green: "forestGreen",
            blue: "skyBlue",
          };

          if (savedFontColor && legacyColorMap[savedFontColor]) {
            color = legacyColorMap[savedFontColor];
          }
        }

        setThemeModeState(mode);
        setFontColorKey(color);
      } catch (error) {
        console.log("Error loading theme settings:", error);
      } finally {
        setLoaded(true);
      }
    }

    void loadThemeSettings();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);

    void AsyncStorage.setItem(THEME_MODE_KEY, mode).catch((error) => {
      console.log("Error saving theme mode:", error);
    });
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === "day" ? "night" : "day");
  };

  const setFontColor = (color: FontColor) => {
    setFontColorKey(color);

    void AsyncStorage.setItem(FONT_COLOR_KEY, color).catch((error) => {
      console.log("Error saving font color:", error);
    });
  };

  const isNight = themeMode === "night";

  const colors = useMemo<ThemeColors>(() => {
    return isNight ? NIGHT_COLORS : DAY_COLORS;
  }, [isNight]);

  const fontColor = isNight
    ? DARKER_FONT_COLORS[fontColorKey]
    : FONT_COLORS[fontColorKey];

  const value = useMemo<ThemeContextType>(
    () => ({
      themeMode,
      setThemeMode,
      toggleThemeMode,

      fontColor,
      fontColorKey,
      setFontColor,

      colors,
      isNight,
    }),
    [themeMode, fontColor, fontColorKey, colors, isNight],
  );

  if (!loaded) {
    /*
     * The provider still renders immediately using the new defaults:
     * Day Mode + Forest Green.
     */
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }

  return context;
}
