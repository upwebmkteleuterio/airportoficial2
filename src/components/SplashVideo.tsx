import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface SplashVideoProps {
  onFinish: () => void;
  videoUrl: string;
}

export const SplashVideo: React.FC<SplashVideoProps> = ({ onFinish, videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Failsafe: if video doesn't end or play fails, clear after 8s
    const timeout = setTimeout(() => {
      onFinish();
    }, 8000);
    return () => clearTimeout(timeout);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes expand-glow {
          0% {
            width: 0%;
            opacity: 0;
          }
          20% {
            opacity: 1;
            width: 20%;
          }
          80% {
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }
        .animate-expand-glow {
          animation: expand-glow 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.4);
        }
      `}</style>

      {error ? (
        <div className="text-white text-center p-6 flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro ao carregar o vídeo de entrada</h2>
          <p className="text-gray-400 max-w-md text-sm">O link do vídeo fornecido expirou. Por favor, envie um novo link persistente (sem expiração).</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted
            playsInline
            onEnded={onFinish}
            onError={() => setError(true)}
            className="w-full h-full object-cover"
          />
          {/* Loading Indicator Overlay */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 w-full max-w-[200px] pointer-events-none z-10">
            {/* The Bar */}
            <div className="w-full h-[3px] bg-white/20 rounded-full relative overflow-hidden backdrop-blur-sm">
              {/* Expanding Silver Glow */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-slate-200 to-transparent animate-expand-glow h-full"></div>
            </div>
            {/* Text */}
            <span className="text-white/70 text-[10px] font-semibold tracking-[0.25em] uppercase animate-pulse">
              Carregando...
            </span>
          </div>
        </>
      )}
    </div>
  );
};
