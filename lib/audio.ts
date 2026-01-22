import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const isSSR = typeof window === 'undefined';

// Web/Electron: Use Web Audio API with a simple beep
// Mobile: Use expo-av
let Audio: any = null;
if (!isSSR && !isWeb) {
  try {
    Audio = require('expo-av').Audio;
  } catch (e) {
    Audio = null;
  }
}

// Web-based beep using AudioContext
function webBeep(frequency = 440, duration = 200) {
  if (isSSR || typeof window === 'undefined') return;
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // Silently fail
  }
}

export async function playSound() {
  if (isSSR) return;
  
  if (isWeb) {
    // For web/desktop, use a pleasant double beep
    webBeep(523.25, 150); // C5
    setTimeout(() => webBeep(659.25, 200), 180); // E5
    return;
  }
  
  // Mobile: use expo-av
  if (!Audio) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
       require('../assets/notification.mp3')
    );
    await sound.playAsync();
  } catch (error) {
    console.log('Error playing sound:', error);
  }
}

export async function playBeep() {
  if (isSSR) return;
  
  if (isWeb) {
    webBeep(880, 100); // A5 quick beep
    return;
  }
  
  // Mobile: use expo-av
  if (!Audio) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3')
    );
    await sound.playAsync();
  } catch (e) {}
}
