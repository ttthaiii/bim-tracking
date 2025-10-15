import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const getFirebaseConfig = (): FirebaseOptions | undefined => {
  // สำหรับ Client-side: ใช้ค่าที่ถูก inject มาจาก build time
  if (typeof window !== 'undefined') {
    // Next.js จะ inline ค่าเหล่านี้ตอน build
    const clientConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // ตรวจสอบว่ามีค่าครบหรือไม่
    if (Object.values(clientConfig).every(value => value)) {
      return clientConfig;
    }
    
    console.error('Firebase client config is incomplete:', clientConfig);
  }
  
  // สำหรับ Server-side: ใช้ FIREBASE_CONFIG
  if (process.env.FIREBASE_CONFIG && typeof window === 'undefined') {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.error('Failed to parse FIREBASE_CONFIG:', e);
    }
  }
  
  return undefined;
};

const firebaseConfig = getFirebaseConfig();

if (!firebaseConfig) {
  console.error('Firebase configuration is missing. Available env vars:', {
    hasFirebaseConfig: !!process.env.FIREBASE_CONFIG,
    hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    isClient: typeof window !== 'undefined',
  });
  throw new Error('Firebase configuration is missing or invalid. Please check your environment variables.');
}

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const ensureAuthenticated = async () => {
  console.log('Skipping authentication for development');
  return { uid: 'dev-user' }; 
};

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;