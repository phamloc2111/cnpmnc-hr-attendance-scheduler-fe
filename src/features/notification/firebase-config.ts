export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? '',
}
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() ?? ''
export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean) && !!vapidKey
