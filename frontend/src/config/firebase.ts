import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ฟังก์ชันสำหรับแยก JSON string ออกมาเป็น object
function getFirebaseConfig() {
  // ตรวจสอบว่าโค้ดกำลังรันอยู่ฝั่ง Client และมีตัวแปรที่ Firebase App Hosting ใส่ให้หรือไม่
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
    try {
      // ตัวแปรนี้จะถูกแทนที่ด้วยค่าจริงตอน Build
      return JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
    } catch (e) {
      console.error("Could not parse NEXT_PUBLIC_FIREBASE_CONFIG", e);
      return undefined;
    }
  }
  // ถ้าไม่มี ให้ใช้ค่าจากตัวแปรแต่ละตัว (สำหรับ Local Development)
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
// เพิ่มการตรวจสอบว่า config มีค่าหรือไม่ ก่อนที่จะ initialize
const app = firebaseConfig?.projectId ? initializeApp(firebaseConfig) : undefined;

if (!app) {
  throw new Error("Firebase configuration is missing or invalid.");
}

export const db = getFirestore(app);
export const storage = getStorage(app);

// Temporary: Skip authentication for development
export const ensureAuthenticated = async () => {
  console.log('Skipping authentication for development');
  return null;
};

export default app;