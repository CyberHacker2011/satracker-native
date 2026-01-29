import { Stack } from "expo-router";
import { View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { SidebarToggle } from "../../components/SidebarToggle";
import { HeaderNotificationBtn } from "../../components/HeaderNotificationBtn";
import { HeaderPremiumBtn } from "../../components/HeaderPremiumBtn";

export default function Layout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLeft: () => <SidebarToggle />,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => (
          <View
            style={{
              marginRight: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <HeaderPremiumBtn />
            <HeaderNotificationBtn />
          </View>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
      <Stack.Screen name="study-room" options={{ title: "Focus Mode" }} />
      <Stack.Screen name="check-in" options={{ title: "Check-in" }} />
      <Stack.Screen name="plan" options={{ title: "Study Plan" }} />
      <Stack.Screen name="profile" options={{ title: "My Profile" }} />
    </Stack>
  );
}
