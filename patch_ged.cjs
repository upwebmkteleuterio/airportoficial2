const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

const regex = /<div className="flex items-center gap-2">\s*\{\/\* Quick Search \*\/\}\s*<div className="relative w-64">([\s\S]*?)<\/div>\s*<select/m;
const replacement = `<div className="flex flex-col gap-3">
          {/* Quick Search */}
          <div className="relative w-full">
$1</div>
          
          <div className="flex items-center gap-2">
          <select`;

content = content.replace(regex, replacement);

const regex2 = /<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Key Metrics/m;
const replacement2 = `</button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Key Metrics`;
content = content.replace(regex2, replacement2);
fs.writeFileSync('src/pages/CentralGed.tsx', content);
