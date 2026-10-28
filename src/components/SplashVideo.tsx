import React, { useEffect, useRef } from 'react';

interface SplashVideoProps {
  onFinish: () => void;
  videoUrl: string;
}

/**
 * Abertura com vídeo.
 *
 * É apenas uma sobreposição: o sistema já está montado por baixo dela, então a
 * aplicação nunca fica indisponível por causa do vídeo.
 */
export const SplashVideo: React.FC<SplashVideoProps> = ({ onFinish, videoUrl }) => {
  // Mantém sempre a versão mais recente do callback sem reiniciar o temporizador.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Teto absoluto de segurança: se o vídeo não carregar ou não terminar, a
  // abertura sai assim mesmo. Roda uma única vez.
  useEffect(() => {
    const timeout = setTimeout(() => onFinishRef.current(), 8000);
    return () => clearTimeout(timeout);
  }, []);

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

      <video
        src={videoUrl}
        autoPlay
        muted
        playsInline
        onEnded={() => onFinishRef.current()}
        onError={() => onFinishRef.current()}
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
    </div>
  );
};
