import { StudyAssistant } from "../../components/StudyAssistant";
import { ThemedView } from "../../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AIScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <StudyAssistant variant="fullscreen" />
    </ThemedView>
  );
}
