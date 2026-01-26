import { useRouter } from "expo-router";

export function useSafeBack() {
  const router = useRouter();

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/");
    }
  };

  return safeBack;
}
