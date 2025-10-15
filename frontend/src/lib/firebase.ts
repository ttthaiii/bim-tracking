import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ✅ Default Firebase Config
const DEFAULT_FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyDyDWYrnfs-xgGAfeERy6GQKrm-ODm_jCA",
  authDomain: "bim-tracking.firebaseapp.com",
  projectId: "bim-tracking",
  storageBucket: "bim-tracking.firebasestorage.app",
  messagingSenderId: "582470142790",
  appId: "1:582470142790:web:a5005b7fd7332152a63347"
};

const getFirebaseConfig = (): FirebaseOptions => {
  // สำหรับ Server-side (Next.js SSR)
  if (process.env.FIREBASE_CONFIG && typeof window === 'undefined') {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.error('Failed to parse FIREBASE_CONFIG:', e);
    }
  }
  
  // สำหรับ Client-side
  if (typeof window !== 'undefined') {
    const hasEnvVars = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    const clientConfig: FirebaseOptions = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    };
    
    console.log(hasEnvVars ? '✅ Using .env.local config' : '⚠️ Using default config');
    return clientConfig;
  }
  
  // ✅ ถ้าไม่ใช่ทั้ง client และ server ที่มี config ให้ใช้ default
  console.log('⚠️ Using default Firebase config (server-side initialization)');
  return DEFAULT_FIREBASE_CONFIG;
};

const firebaseConfig = getFirebaseConfig();

// ✅ ลบส่วนที่ throw error ออก
// ไม่ต้องมีบรรทัดนี้อีกต่อไป:
// if (!firebaseConfig) { throw new Error(...) }

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