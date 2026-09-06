const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

// I'll just restore the original brackets for that part
content = content.replace(/<\/button>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Key Metrics/m, 
`                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Key Metrics`);

// check if there is an extra bracket or missing one
// Actually, let's just count open/close divs in that area.

fs.writeFileSync('src/pages/CentralGed.tsx', content);
