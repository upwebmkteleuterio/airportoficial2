const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// 1. Update background layer
content = content.replace(
  /<div className="absolute bottom-0 left-0 right-0 top-0 bg-\[radial-gradient\(circle_800px_at_100%_200px,#d5c5ff,transparent\)\] dark:bg-\[radial-gradient\(circle_800px_at_100%_200px,#3b2d63,transparent\)\]"><\/div>/g,
  '<div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:opacity-20"></div>'
);

// Make the grid more visible in dark mode
content = content.replace(
  /dark:bg-\[linear-gradient\(to_right,#ffffff0a_1px,transparent_1px\),linear-gradient\(to_bottom,#ffffff0a_1px,transparent_1px\)\]/g,
  'dark:bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)]'
);

// 2. Fix hover effects in light mode
content = content.replace(
  /hover:bg-white\/40/g,
  'hover:bg-slate-200/50'
);
content = content.replace(
  /hover:bg-white\/50/g,
  'hover:bg-slate-200/50'
);

// 3. Fix active state background in light mode (make it a bit more visible than white/60 since background is white)
content = content.replace(
  /bg-white\/60/g,
  'bg-teal-50/50'
);


fs.writeFileSync('src/components/Sidebar.tsx', content);
