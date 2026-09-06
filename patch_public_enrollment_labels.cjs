const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const spanRegex = /<span className="text-sm font-semibold text-slate-700 capitalize">\{key\.replace\('_', ' '\)\}<\/span>/g;
const newSpan = `<span className="text-sm font-semibold text-slate-700 capitalize text-center">
                        {key === 'certidao_antecedentes_federais' 
                          ? 'Certidão de Antecedentes Criminais - Justiça Federal' 
                          : key === 'certidao_antecedentes_estaduais'
                            ? 'Certidão de Antecedentes Criminais - Justiça Estadual'
                            : key.replace(/_/g, ' ')}
                      </span>`;

content = content.replace(spanRegex, newSpan);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
