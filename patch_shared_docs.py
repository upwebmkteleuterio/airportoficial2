import re

content = """import React, { useState } from 'react';
import { SlidePanel } from './ui/SlidePanel';
import { FileText, Download, ExternalLink, X, Maximize2 } from 'lucide-react';
import { Usuario } from '../types';

interface SharedDocumentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  student: Usuario | null;
}

export function SharedDocumentsPanel({ isOpen, onClose, student }: SharedDocumentsPanelProps) {
  const [activeDocId, setActiveDocId] = useState<string>('rg');
  
  if (!student) return null;

  const docs = [
    { id: 'rg', label: 'RG', file: 'rg.pdf' },
    { id: 'cpf', label: 'CPF', file: 'cpf.pdf' },
    { id: 'cnh', label: 'Carteira de Motorista (CNH)', file: 'cnh.pdf' },
    { id: 'residencia', label: 'Comprovante de Residência', file: 'residencia.pdf' },
    { id: 'ensino_medio', label: 'Certificado Ensino Médio', file: 'ensino_medio.pdf' },
    { id: 'antecedentes', label: 'Certidão de Antecedentes Criminais', file: 'antecedentes.pdf' }
  ];

  const activeDoc = docs.find(d => d.id === activeDocId) || docs[0];

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Documentos: {student.nome_completo}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Sidebar com a lista */}
        <div className="w-1/3 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-y-auto">
          <div className="p-4 space-y-2">
             {docs.map((doc) => (
              <button 
                key={doc.id} 
                onClick={() => setActiveDocId(doc.id)}
                className={`w-full text-left flex items-center justify-between p-3 rounded-lg transition-colors ${activeDocId === doc.id ? 'bg-teal-50 dark:bg-slate-800 border-[#005f5f] border' : 'bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 hover:border-[#005f5f]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeDocId === doc.id ? 'bg-[#005f5f] text-white' : 'bg-teal-50 dark:bg-slate-800 text-[#005f5f] dark:text-teal-400'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${activeDocId === doc.id ? 'text-[#005f5f] dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{doc.label}</h4>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{doc.file}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Visualizador */}
        <div className="w-2/3 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">{activeDoc.label}</h4>
              <p className="text-xs text-gray-500">{activeDoc.file}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.open(activeDoc.file, '_blank')}
                className="p-2 text-gray-400 hover:text-[#005f5f] dark:hover:text-teal-400 transition-colors bg-gray-100 dark:bg-slate-800 rounded-lg" 
                title="Tela Cheia"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-[#005f5f] dark:hover:text-teal-400 transition-colors bg-gray-100 dark:bg-slate-800 rounded-lg" title="Baixar">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-hidden relative flex items-center justify-center bg-gray-100 dark:bg-slate-900">
             {/* Mocking PDF viewer */}
             <div className="w-full h-full bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center flex-col gap-4">
                <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">Pré-visualização do Documento</p>
             </div>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}
"""

with open('src/components/SharedDocumentsPanel.tsx', 'w') as f:
    f.write(content)
