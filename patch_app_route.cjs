const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldRouting = `  // Check for public enrollment route
  if (window.location.pathname.startsWith('/enroll')) {
    return <PublicEnrollment />;
  }`;

const newRouting = `  // Check for public enrollment route via company link: /companyName/companyId
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length === 2 && pathParts[1].length > 10) { // basic heuristic for id length
    return <PublicEnrollment />;
  }
  if (window.location.pathname.startsWith('/enroll')) {
    return <PublicEnrollment />;
  }`;

content = content.replace(oldRouting, newRouting);
fs.writeFileSync('src/App.tsx', content);
