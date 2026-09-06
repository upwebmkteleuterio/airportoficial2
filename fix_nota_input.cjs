const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const notaInputComponent = `function NotaInput({ value, onChange }: { value?: number, onChange: (val?: number) => void }) {
  const [localVal, setLocalVal] = React.useState(value !== undefined ? String(value).replace('.', ',') : '');

  React.useEffect(() => {
    setLocalVal(value !== undefined ? String(value).replace('.', ',') : '');
  }, [value]);

  return (
    <input
      type="text"
      value={localVal}
      onChange={(e) => {
        let val = e.target.value.replace(/[^0-9,]/g, '');
        if (val.includes(',')) {
          const parts = val.split(',');
          val = parts[0] + ',' + parts.slice(1).join('');
        }
        setLocalVal(val);
      }}
      onBlur={() => {
        let num = parseFloat(localVal.replace(',', '.'));
        if (localVal === '') {
          onChange(undefined);
        } else if (!isNaN(num)) {
          if (num > 10) num = 10;
          onChange(num);
          setLocalVal(String(num).replace('.', ','));
        } else {
          setLocalVal(value !== undefined ? String(value).replace('.', ',') : '');
        }
      }}
      className="w-16 mx-auto px-2 py-1 text-center border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
      placeholder="0,0"
    />
  );
}
`;

// Insert the component before ClassDetails
content = content.replace('function ClassDetails() {', notaInputComponent + '\nfunction ClassDetails() {');

// Replace the inline inputs
content = content.replace(/<input\s+type="text"\s+value=\{nota1[^>]+>/g, '<NotaInput value={nota1} onChange={(val) => updateMatricula({ id: m.id, updates: { nota_1_chamada: val } })} />');
content = content.replace(/<input\s+type="text"\s+value=\{nota2[^>]+>/g, '<NotaInput value={nota2} onChange={(val) => updateMatricula({ id: m.id, updates: { nota_2_chamada: val } })} />');

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
