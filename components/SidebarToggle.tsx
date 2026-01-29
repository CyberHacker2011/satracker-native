import React from "react";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Menu } from "lucide-react-native";
import { useSidebar } from "../context/SidebarContext";
import { useTheme } from "../context/ThemeContext";
import { View, Platform } from "react-native";

export function SidebarToggle() {
  const { sidebarVisible, toggleSidebar } = useSidebar();
  const { theme } = useTheme();

  if (sidebarVisible) return null;

  return (
    <TouchableOpacity
      onPress={toggleSidebar}
      style={{
        marginLeft: 16,
        padding: 4,
      }}
    >
      <Menu size={24} color={theme.textPrimary} />
    </TouchableOpacity>
  );
}
