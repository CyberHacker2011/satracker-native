import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

export function App() {
  console.log("App Mounting...");
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

console.log("Registering Root Component...");
registerRootComponent(App);
