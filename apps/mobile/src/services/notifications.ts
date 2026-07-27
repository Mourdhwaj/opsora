import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { Platform, PermissionsAndroid } from 'react-native';

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const authStatus = await messaging().requestPermission();
  return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
         authStatus === messaging.AuthorizationStatus.PROVISIONAL;
}

export async function getFCMToken(): Promise<string | null> {
  try {
    return await messaging().getToken();
  } catch {
    return null;
  }
}

export async function saveFCMToken(userId: string, tenantId: string) {
  const token = await getFCMToken();
  if (!token) return;
  await firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('people')
    .doc(userId)
    .update({ fcmToken: token });
  messaging().onTokenRefresh(async (newToken) => {
    await firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('people')
      .doc(userId)
      .update({ fcmToken: newToken });
  });
}

export function setupNotificationHandlers() {
  messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground notification:', remoteMessage);
  });
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Notification opened:', remoteMessage);
  });
  messaging().getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      console.log('Initial notification:', remoteMessage);
    }
  });
}
