const fs = require('fs');
let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const oldHeader = `        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4 shadow-lg border border-slate-800 dark:border-slate-700">
            <Plane className="w-9 h-9 text-teal-400" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">
            Airport
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1 font-medium">
            Centralized Aviation Management
          </p>
        </div>`;

const newHeader = `        <div className="mb-6 flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <img 
              src="https://i.postimg.cc/9MrTVGJ3/logo-airpot.png" 
              alt="Airport Logo" 
              className="h-16 w-auto object-contain dark:brightness-0 dark:invert"
            />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight sr-only">
            Airport
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1 font-medium sr-only">
            Centralized Aviation Management
          </p>
        </div>`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync('src/pages/Login.tsx', content);
