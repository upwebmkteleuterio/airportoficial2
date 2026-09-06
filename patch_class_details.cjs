const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// 1. Destructure loading states
content = content.replace(
  "    classData,",
  "    classData,\n    isLoadingClass,\n    isLoadingMatriculas,\n    isLoadingDiario,\n    isLoadingInstructors,"
);

// 2. Remove the blocking return
content = content.replace(
  `  if (!classData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        Carregando detalhes da turma...
      </div>
    );
  }`,
  ``
);

// 3. Header skeletons
content = content.replace(
  `<span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold px-2 py-0.5 rounded border border-teal-500/20">
                {classData.id_anac}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                ID Interno: T-OP-{classData.id_interno_escola}
              </span>`,
  `<span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold px-2 py-0.5 rounded border border-teal-500/20">
                {isLoadingClass ? <div className="w-16 h-4 bg-teal-500/20 animate-pulse rounded"></div> : classData?.id_anac}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                {isLoadingClass ? <div className="w-32 h-4 bg-gray-200 dark:bg-slate-700 animate-pulse rounded"></div> : \`ID Interno: T-OP-\${classData?.id_interno_escola}\`}
              </span>`
);

content = content.replace(
  `<h2 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {course?.nome_curso || 'Curso de Capacitação'}
            </h2>`,
  `<h2 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {isLoadingClass ? <div className="w-64 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1"></div> : (course?.nome_curso || 'Curso de Capacitação')}
            </h2>`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
