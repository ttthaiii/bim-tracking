const nextConfig = {
  env: (() => {
    // Parse FIREBASE_WEBAPP_CONFIG from build time
    const firebaseConfig = process.env.FIREBASE_WEBAPP_CONFIG 
      ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG) 
      : {};
    
    return {
      NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey || '',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain || '',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId || '',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket || '',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId || '',
      NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId || '',
    };
  })(),
};

export default nextConfig;