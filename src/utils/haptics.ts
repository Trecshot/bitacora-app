import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Dispara vibración háptica de impacto de forma segura en plataformas nativas (iOS / Android).
 */
export function triggerHapticImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): void {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(style).catch(() => {});
  }
}

/**
 * Dispara vibración háptica de notificación de forma segura en plataformas nativas.
 */
export function triggerHapticNotification(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
): void {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(type).catch(() => {});
  }
}
