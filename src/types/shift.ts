export interface Shift {
  id: string;
  nome: string;
  horario_inicio: string; // HH:mm
  horario_termino: string; // HH:mm
  primeira_chamada: string; // HH:mm
  segunda_chamada: string; // HH:mm
  ativo: boolean;
  is_system: boolean;
}
