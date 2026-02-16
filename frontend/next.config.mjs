import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Required by Firebase App Hosting adapter.
    output: 'standalone',
    // Explicitly pin tracing root to frontend to avoid lockfile-root ambiguity.
    outputFileTracingRoot: __dirname,
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
    // Removing explicit turbopack config to avoid schema validation errors in production build
    // turbopack: { root: __dirname },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
