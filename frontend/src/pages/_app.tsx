import type { AppProps } from 'next/app';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { FirestoreCacheProvider } from '@/contexts/FirestoreCacheContext';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardProvider } from '@/context/DashboardContext';
import { CacheProvider } from '@/context/CacheContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <DashboardProvider>
        <CacheProvider>
          {/* Keep legacy providers if they are still needed for some pages, or typically replace them. 
              Given the error is about CacheProvider, we strictly ensure it is present. 
              If the project is migrating, we might wrap everything. */}
          <FirestoreCacheProvider>
            <GlobalDataProvider>
              <Component {...pageProps} />
            </GlobalDataProvider>
          </FirestoreCacheProvider>
        </CacheProvider>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default MyApp;