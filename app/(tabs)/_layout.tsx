import { Tabs } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { LayoutDashboard, BookOpen, CheckSquare, Calendar, User } from "lucide-react-native";
import { HeaderNotificationBtn } from "../../components/HeaderNotificationBtn";
import { HeaderPremiumBtn } from "../../components/HeaderPremiumBtn";
import { View } from "react-native";

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 12 }}>
            <HeaderPremiumBtn />
            <HeaderNotificationBtn />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="study-room"
        options={{
          title: "Study",
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => <CheckSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      {/* Hidden routes - accessible but not in tab bar */}
      <Tabs.Screen
        name="focus"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}
