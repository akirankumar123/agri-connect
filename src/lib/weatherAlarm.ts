import type { WeatherData } from './weatherService';
import { sendWeatherAlertSMS } from './smsService';

export interface AlarmSettings {
  enabled: boolean;
  rainyWeatherAlarm: boolean;
  heavyRainThreshold: number; // mm
  volume: number; // 0-1
  soundEnabled: boolean;
  smsEnabled: boolean;
}

const DEFAULT_ALARM_SETTINGS: AlarmSettings = {
  enabled: true,
  rainyWeatherAlarm: true,
  heavyRainThreshold: 5,
  volume: 0.7,
  soundEnabled: true,
  smsEnabled: false,
};

const STORAGE_KEY = 'weather_alarm_settings';

/**
 * Get alarm settings from localStorage
 */
export const getAlarmSettings = (userId: string): AlarmSettings => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (stored) {
      return { ...DEFAULT_ALARM_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading alarm settings:', error);
  }
  return DEFAULT_ALARM_SETTINGS;
};

/**
 * Save alarm settings to localStorage
 */
export const saveAlarmSettings = (userId: string, settings: AlarmSettings): void => {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving alarm settings:', error);
  }
};

/**
 * Check if weather conditions warrant an alarm
 */
export const shouldTriggerAlarm = (
  weatherData: WeatherData,
  settings: AlarmSettings
): { trigger: boolean; reason: string; severity: 'light' | 'moderate' | 'heavy' } => {
  if (!settings.enabled || !settings.rainyWeatherAlarm) {
    return { trigger: false, reason: '', severity: 'light' };
  }

  const { precipitation, condition, forecast } = weatherData;

  // Check current precipitation
  if (precipitation > 0) {
    if (precipitation >= settings.heavyRainThreshold) {
      return {
        trigger: true,
        reason: `Heavy rain detected (${precipitation.toFixed(1)}mm)`,
        severity: 'heavy',
      };
    } else if (precipitation >= 2) {
      return {
        trigger: true,
        reason: `Moderate rain detected (${precipitation.toFixed(1)}mm)`,
        severity: 'moderate',
      };
    } else {
      return {
        trigger: true,
        reason: `Light rain detected (${precipitation.toFixed(1)}mm)`,
        severity: 'light',
      };
    }
  }

  // Check condition string
  const rainyConditions = ['rain', 'rainy', 'drizzle', 'shower', 'thunderstorm', 'storm'];
  if (rainyConditions.some((cond) => condition.toLowerCase().includes(cond))) {
    return {
      trigger: true,
      reason: `Rainy weather condition: ${condition}`,
      severity: 'moderate',
    };
  }

  // Check forecast for upcoming rain
  const upcomingRain = forecast.find((f) => f.precipitation > settings.heavyRainThreshold);
  if (upcomingRain) {
    return {
      trigger: true,
      reason: `Heavy rain expected soon (${upcomingRain.precipitation.toFixed(1)}mm on ${upcomingRain.date})`,
      severity: 'moderate',
    };
  }

  return { trigger: false, reason: '', severity: 'light' };
};

/**
 * Play alarm sound
 */
export const playAlarmSound = (volume: number = 0.7): void => {
  try {
    // Create an audio context for generating alarm sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create oscillator for alarm tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set alarm sound properties (alternating tones)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.3);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.6);

    // Set volume
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);

    console.log('🔔 Weather alarm sound played');
  } catch (error) {
    console.error('Error playing alarm sound:', error);
  }
};

/**
 * Request notification permission and show notification
 */
export const showWeatherNotification = async (
  title: string,
  message: string,
  severity: 'light' | 'moderate' | 'heavy'
): Promise<void> => {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return;
  }

  // Request permission if not granted
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  // Show notification if permission granted
  if (Notification.permission === 'granted') {
    const icon = severity === 'heavy' ? '🌧️' : severity === 'moderate' ? '🌦️' : '☔';

    new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'weather-alarm',
      requireInteraction: severity === 'heavy',
      silent: false,
    });

    console.log(`${icon} Weather notification shown: ${title}`);
  }
};

/**
 * Trigger alarm with sound, notification, and optional SMS
 */
export const triggerWeatherAlarm = async (
  reason: string,
  severity: 'light' | 'moderate' | 'heavy',
  settings: AlarmSettings,
  userPhone?: string
): Promise<any> => {
  console.group('🚨 Weather Alarm Triggered');
  console.log('Reason:', reason);
  console.log('Severity:', severity);
  console.log('Settings:', settings);
  console.log('User Phone:', userPhone ? 'Provided' : 'Not provided');
  console.groupEnd();

  // Play sound if enabled
  if (settings.soundEnabled) {
    playAlarmSound(settings.volume);
  }

  // Show browser notification
  await showWeatherNotification(
    '⚠️ Rainy Weather Alert',
    reason,
    severity
  );

  // Send SMS if enabled and phone number available
  if (settings.smsEnabled && userPhone) {
    try {
      const smsResult = await sendWeatherAlertSMS(userPhone, reason, severity);
      console.log('📱 Weather alert SMS sent to:', userPhone, smsResult);
      return smsResult;
    } catch (error) {
      console.error('Failed to send weather alert SMS:', error);
    }
  } else if (settings.smsEnabled && !userPhone) {
    console.warn('SMS enabled but no phone number available for weather alert');
  }
  return null;
};

/**
 * Log alarm activity for debugging
 */
export const logAlarmActivity = (
  action: 'triggered' | 'dismissed' | 'settings_changed',
  details: any
): void => {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    details,
  };

  console.log('🔔 Alarm Activity:', log);

  // Store in localStorage for history
  try {
    const history = JSON.parse(localStorage.getItem('alarm_history') || '[]');
    history.push(log);
    // Keep only last 50 entries
    if (history.length > 50) {
      history.shift();
    }
    localStorage.setItem('alarm_history', JSON.stringify(history));
  } catch (error) {
    console.error('Error logging alarm activity:', error);
  }
};

/**
 * Get alarm history
 */
export const getAlarmHistory = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('alarm_history') || '[]');
  } catch (error) {
    console.error('Error getting alarm history:', error);
    return [];
  }
};