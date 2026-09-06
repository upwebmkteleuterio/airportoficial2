const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /item\.endereco_realizacao,\n\s*item\.status_prazo_notas,\n\s*item\.dias_para_vencimento,\n\s*item\.status_operacional_sn \? 'S' : 'N'/;

const replacement = `item.endereco_realizacao,
        item.nota_lancada ? 'Sim' : 'Não',
        (() => {
          if (item.nota_lancada) {
            if (item.data_lancamento_notas && item.data_lancada_real) {
              const lancada = new Date(item.data_lancada_real + 'T00:00:00');
              const limite = new Date(item.data_lancamento_notas + 'T00:00:00');
              const diffTime = lancada.getTime() - limite.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays > 0 ? \`Lançada \${diffDays}d atrasado\` : 'Nota Lançada';
            }
            return 'Nota Lançada';
          }
          if (item.data_lancamento_notas) {
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const limite = new Date(item.data_lancamento_notas + 'T00:00:00');
            const diffTime = limite.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays < 0 ? \`Atrasado \${Math.abs(diffDays)} dias\` : \`Faltam \${diffDays} dias\`;
          }
          return '-';
        })(),
        item.status_operacional_sn ? 'S' : 'N'`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
