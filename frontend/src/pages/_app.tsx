import { GlobalDataProvider } from '@/contexts/GlobalDataContext';

function MyApp({ Component, pageProps }) {
  return (
    <FirestoreCacheProvider>
      <GlobalDataProvider>
        <Component {...pageProps} />
      </GlobalDataProvider>
    </FirestoreCacheProvider>
  );
}

export default MyApp;