const fs = require('fs');

let content = fs.readFileSync('src/pages/Shifts.tsx', 'utf8');

const searchBarRegex = /<div className="relative w-full sm:w-80 md:w-96 group">[\s\S]*?<\/div>/m;
const newSearchBar = `<div className="relative w-full sm:w-80 md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
            <input
              id="top-search-input"
              type="text"
              placeholder="Buscar turno por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-1.5 bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-white font-sans text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all outline-none shadow-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-gray-500 dark:text-gray-400 font-mono border border-gray-200 dark:border-slate-700">
              ⌘K
            </div>
          </div>`;

content = content.replace(searchBarRegex, newSearchBar);
fs.writeFileSync('src/pages/Shifts.tsx', content);
