import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../context/ThemeContext";

export function HeaderNotificationBtn() {
  const [count, setCount] = useState(0);
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { count: c } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("dismissed_at", null);
            
        if (mounted && c !== null) setCount(c);
    }

    fetchCount();

    const sub = supabase.channel("notif-header")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
             fetchCount();
        })
        .subscribe();
    
    return () => {
        mounted = false;
        supabase.removeChannel(sub);
    };
  }, []);

  return (
    <TouchableOpacity 
        style={styles.btn}
        onPress={() => router.push("/notifications")}
    >
        <Bell size={24} color={theme.textPrimary} />
        {count > 0 && (
            <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{count > 9 ? "9+" : count}</ThemedText>
            </View>
        )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
    btn: {
        paddingRight: 16,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: 8,
        backgroundColor: '#f59e0b',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
        borderWidth: 1,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    }
});
