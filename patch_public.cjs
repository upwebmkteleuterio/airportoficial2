const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const oldMap = `                    {availableClasses.map(cls => (
                      <label 
                        key={cls.id} 
                        className={\`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all \${formData.turma_id === cls.id ? 'border-teal-500 bg-teal-50/50 shadow-md' : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'}\`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-slate-800 text-lg">{\`T-OP-\${cls.id_interno_escola}\`}</span>
                          <input 
                            type="radio" 
                            name="turma_id"
                            className="text-teal-500 w-5 h-5 focus:ring-teal-500"
                            value={cls.id}
                            checked={formData.turma_id === cls.id}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-600 mb-1">{(courses.find(c => c.id === cls.curso_id)?.nome_curso || "Curso de Aviação")}</span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded px-2 py-1 self-start">
                          <MapPin className="w-3 h-3" /> {cls.turno}
                        </div>
                      </label>
                    ))}`;

const newMap = `                    {availableClasses.map(cls => (
                      <div 
                        key={cls.id} 
                        onClick={() => {
                          if (formData.turma_id === cls.id) {
                            setFormData({ ...formData, turma_id: '' });
                          } else {
                            setFormData({ ...formData, turma_id: cls.id });
                          }
                        }}
                        className={\`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all \${formData.turma_id === cls.id ? 'border-teal-500 bg-teal-50/50 shadow-md' : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'}\`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-slate-800 text-base leading-tight pr-2">
                            {(courses.find(c => c.id === cls.curso_id)?.nome_curso || "Curso de Aviação")}
                          </span>
                          <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 \${formData.turma_id === cls.id ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'}\`}>
                            {formData.turma_id === cls.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 w-fit">
                            <span>Turno: {cls.turno}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{cls.horario_aulas}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Início: {cls.data_inicio ? new Date(cls.data_inicio).toLocaleDateString('pt-BR') : 'A definir'}</span>
                            <span>•</span>
                            <span>Término: {cls.data_termino ? new Date(cls.data_termino).toLocaleDateString('pt-BR') : 'A definir'}</span>
                          </div>
                        </div>
                      </div>
                    ))}`;

content = content.replace(oldMap, newMap);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
