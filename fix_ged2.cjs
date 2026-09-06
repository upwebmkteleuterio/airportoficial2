const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace(/<\/button>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\*\ 3 Summary Cards Row \*\//m, 
`                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      {/* 3 Summary Cards Row */`);

fs.writeFileSync('src/pages/CentralGed.tsx', content);
