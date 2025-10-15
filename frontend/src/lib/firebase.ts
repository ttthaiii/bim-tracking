// frontend/src/lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 1. กำหนดค่า Config สำหรับ Client-side (เบราว์เซอร์) และ Local development
// ค่าเหล่านี้จะถูกดึงมาจากไฟล์ .env.local ของคุณ
const clientCredentials = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 2. ตรวจสอบว่ามีแอป Firebase ที่ถูก initialize แล้วหรือยัง
// เพื่อป้องกันการ initialize ซ้ำซ้อน ซึ่งเป็นสาเหตุของ Error ได้
let app;

if (!getApps().length) {
  // 3. ถ้ายังไม่มีแอป ให้ทำการ initialize
  // ตรวจสอบว่าโค้ดกำลังรันบน Server และมีค่า Config ที่ Firebase App Hosting ให้มาหรือไม่
  if (typeof window === 'undefined' && process.env.FIREBASE_CONFIG) {
    // บน Server ตอน Build: ใช้ค่า Config ที่ Firebase เตรียมให้โดยอัตโนมัติ
    const serverConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    app = initializeApp(serverConfig);
  } else {
    // บน Client หรือ Local Dev: ใช้ค่าจาก .env.local
    app = initializeApp(clientCredentials);
  }
} else {
  // 4. ถ้ามีแอปอยู่แล้ว ให้ใช้แอปเดิม
  app = getApp();
}

// 5. Export service ต่างๆ ไปใช้งาน
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;