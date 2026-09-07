/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SessionContextProvider } from './contexts/SessionContext';
import { SplashVideo } from './components/SplashVideo';
import { AppRoutes } from './app/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const splashVideoUrl = 'https://www.image2url.com/r2/default/videos/1784253706043-4630ea5e-a4c5-44e2-8b0a-6574ad8bfe44.mp4';

  if (showSplash) {
    return <SplashVideo onFinish={() => setShowSplash(false)} videoUrl={splashVideoUrl} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionContextProvider>
          <AppRoutes />
        </SessionContextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
