// functions/src/lib/firebase/admin.ts
import * as admin from "firebase-admin";

// --- Helper Functions to ensure apps are initialized only once ---
const initializeAppOnce = (name: string, config: admin.AppOptions): admin.app.App => {
  return admin.apps.find(app => app?.name === name) || admin.initializeApp(config, name);
};

// --- App Getters (Lazy Initialization) ---

const getTtsdocApp = () => {
  // ดึงค่าจาก environment variables ที่ตั้งค่าไว้ใน Cloud Functions
  const config = {
    credential: admin.credential.cert({
      projectId: process.env.TTSDOC_PROJECT_ID,
      clientEmail: process.env.TTSDOC_CLIENT_EMAIL,
      privateKey: process.env.TTSDOC_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  };
  return initializeAppOnce('ttsdoc-v2', config);
};

const getBimTrackingApp = () => {
  // ใช้ default app ที่ initialize ไว้แล้วในโปรเจกต์นี้
  return admin.apps[0] || admin.initializeApp();
};


// --- Main Exports ---
export const getAdminDb = () => getTtsdocApp().firestore();
export const getBimTrackingDb = () => getBimTrackingApp().firestore();