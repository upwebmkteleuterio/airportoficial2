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

// Abertura com vídeo. Fica desativada enquanto o arquivo não estiver hospedado
// no próprio projeto: para reativar, coloque o vídeo em `public/` e aponte esta
// constante para ele (por exemplo '/abertura.mp4').
const splashVideoUrl = '';

export default function App() {
  const [showSplash, setShowSplash] = React.useState(splashVideoUrl !== '');

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionContextProvider>
          <AppRoutes />
          {showSplash && <SplashVideo videoUrl={splashVideoUrl} onFinish={() => setShowSplash(false)} />}
        </SessionContextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
