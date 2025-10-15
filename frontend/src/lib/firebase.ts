// ตำแหน่ง: frontend/src/lib/firebase.ts

import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const getFirebaseConfig = (): FirebaseOptions | undefined => {
  // กรณีรันบน Server ของ Firebase (ตอน Build / Deploy)
  if (process.env.FIREBASE_CONFIG && typeof window === 'undefined') {
    return JSON.parse(process.env.FIREBASE_CONFIG);
  }

  // กรณีรันในเบราว์เซอร์ (Client-side)
  if (typeof window !== 'undefined') {
    const clientConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    if (Object.values(clientConfig).every(value => value)) {
      return clientConfig;
    }
  }
  return undefined;
};

const firebaseConfig = getFirebaseConfig();

const app = !getApps().length && firebaseConfig
  ? initializeApp(firebaseConfig)
  : getApps().length > 0 ? getApp() : undefined;

if (!app) {
    throw new Error('Firebase configuration is missing or invalid. Please check your environment variables.');
}

export const ensureAuthenticated = async () => {
  console.log('Skipping authentication for development');
  // ในอนาคต ส่วนนี้ควรจะ return ข้อมูลผู้ใช้จริงๆ
  return { uid: 'dev-user' }; 
};

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;