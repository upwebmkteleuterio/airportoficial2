import { supabase } from '../integrations/supabase/client';
import type { StudentMigrationSuccessfulClass } from './studentMigrationService';

export type StudentMigrationHistoryRecord = {
  id: string;
  batch_id: string;
  created_by: string;
  turma_id: string;
  id_interno_escola: number;
  id_anac: string;
  alunos_importados: number;
  source_file: string | null;
  created_at: string;
};

const HISTORY_LIMIT = 100;
const SOURCE_FILE_LIMIT = 255;

function historyError(message: string): Error {
  return new Error(message);
}

async function authenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw historyError('Sessão não autenticada.');
  return data.user.id;
}

export const studentMigrationHistoryService = {
  getAll: async (): Promise<StudentMigrationHistoryRecord[]> => {
    await authenticatedUserId();
    const { data, error } = await supabase
      .from('student_migration_history')
      .select('id,batch_id,created_by,turma_id,id_interno_escola,id_anac,alunos_importados,source_file,created_at')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) throw historyError('Não foi possível carregar o histórico das migrações.');
    return (data ?? []) as StudentMigrationHistoryRecord[];
  },

  saveBatch: async (successfulClasses: StudentMigrationSuccessfulClass[], sourceFile?: string): Promise<void> => {
    if (!successfulClasses.length) return;
    const createdBy = await authenticatedUserId();
    const batchId = crypto.randomUUID();
    const safeSourceFile = sourceFile?.trim().slice(0, SOURCE_FILE_LIMIT) || null;
    const records = successfulClasses.map((turma) => ({
      id: crypto.randomUUID(),
      batch_id: batchId,
      created_by: createdBy,
      turma_id: turma.turmaId,
      id_interno_escola: turma.idInternoEscola,
      id_anac: turma.idAnac,
      alunos_importados: turma.alunosImportados,
      source_file: safeSourceFile,
    }));
    const { error } = await supabase.from('student_migration_history').insert(records);
    if (error) throw historyError('Não foi possível salvar o histórico da migração.');
  },
};

export { HISTORY_LIMIT, SOURCE_FILE_LIMIT };
