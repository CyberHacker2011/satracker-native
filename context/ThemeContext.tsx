import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import storage from "../lib/storage";
import { Colors, ThemeName } from "../constants/Colors";

interface ThemeContextType {
  themeName: ThemeName;
  theme: typeof Colors.light;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeName, setThemeNameState] = useState<ThemeName>("light");

  useEffect(() => {
    // Load saved theme
    storage.getItem("user-theme").then((saved: string | null) => {
      if (saved) {
        setThemeNameState(saved as ThemeName);
      } else if (systemScheme === "dark") {
        setThemeNameState("dark");
      }
    });
  }, [systemScheme]);

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    storage.setItem("user-theme", name);
  };

  const theme = Colors[themeName];

  return (
    <ThemeContext.Provider value={{ themeName, theme, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
