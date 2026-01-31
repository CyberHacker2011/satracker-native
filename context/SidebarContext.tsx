import React, { createContext, useContext, useState, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SidebarContextType {
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
  toggleSidebar: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const [sidebarVisible, setSidebarVisible] = useState(!isSmallScreen);

  useEffect(() => {
    const loadState = async () => {
      try {
        const value = await AsyncStorage.getItem("sidebar_visible");
        if (value !== null) {
          setSidebarVisible(value === "true");
        } else {
          setSidebarVisible(!isSmallScreen);
        }
      } catch (e) {
        console.error("SidebarContext: Error loading state", e);
      }
    };
    loadState();
  }, []);

  const toggleSidebar = async () => {
    const nextValue = !sidebarVisible;
    setSidebarVisible(nextValue);
    try {
      await AsyncStorage.setItem("sidebar_visible", String(nextValue));
    } catch (e) {
      console.error("SidebarContext: Error saving state", e);
    }
  };

  return (
    <SidebarContext.Provider
      value={{ sidebarVisible, setSidebarVisible, toggleSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
