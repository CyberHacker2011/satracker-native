import { Platform } from "react-native";

// Safe storage for Web, Android, iOS and Electron
// In Electron/Web, we use localStorage directly if AsyncStorage is not behaving
// In Build time (SSR), we use a mock

const isSSR = Platform.OS === "web" && typeof window === "undefined";

interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const mock = {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
};

let storage: Storage = mock;

try {
    if (isSSR) {
        storage = mock;
    } else if (Platform.OS === "web") {
        storage = {
            getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
            setItem: (key, value) => { window.localStorage.setItem(key, value); return Promise.resolve(); },
            removeItem: (key) => { window.localStorage.removeItem(key); return Promise.resolve(); },
        };
    } else {
        storage = require("@react-native-async-storage/async-storage").default || require("@react-native-async-storage/async-storage");
    }
} catch (e) {
    storage = mock;
}

export default storage;
