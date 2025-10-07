import type { AppProps } from 'next/app';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { FirestoreCacheProvider } from '@/contexts/FirestoreCacheContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <FirestoreCacheProvider>
      <GlobalDataProvider>
        <Component {...pageProps} />
      </GlobalDataProvider>
    </FirestoreCacheProvider>
  );
}

export default MyApp;