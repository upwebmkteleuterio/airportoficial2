const fs = require('fs');
let content = fs.readFileSync('src/components/SplashVideo.tsx', 'utf8');

const newAnimation = `
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
`;

content = content.replace(/@keyframes expand-glow \{[\s\S]*?\}\n\s*\.animate-expand-glow \{[\s\S]*?\}/, newAnimation.trim());
fs.writeFileSync('src/components/SplashVideo.tsx', content);
