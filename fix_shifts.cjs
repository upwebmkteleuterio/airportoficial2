const fs = require('fs');
let content = fs.readFileSync('src/pages/Shifts.tsx', 'utf8');

content = content.replace("            </div>\n        </div>\n      </div>", "            </div>\n          </div>\n        </div>\n      </div>");
fs.writeFileSync('src/pages/Shifts.tsx', content);
