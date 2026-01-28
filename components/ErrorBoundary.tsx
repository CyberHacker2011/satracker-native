import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Colors } from "../constants/Colors";

interface Props {
  children: ReactNode;
  theme?: typeof Colors.light;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const theme = this.props.theme || Colors.light;

      return (
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: theme.primary }]}>
              Something went wrong
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              The application encountered an unexpected error.
            </Text>

            <View
              style={[
                styles.errorBox,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Text style={[styles.errorText, { color: theme.primary }]}>
                {this.state.error && this.state.error.toString()}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={() => {
                this.setState({ hasError: false, error: null });
                // Optional: Restart app logic
              }}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  errorBox: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 30,
    maxHeight: 200,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
