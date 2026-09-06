export function getAttendancePeriodsForShift(shiftName: string): string[] {
  const name = shiftName.toLowerCase();
  
  if (name.includes('manhã/tarde e noite') || name.includes('manha/tarde e noite')) {
    return ['Manhã/Tarde', 'Tarde/Noite'];
  }
  
  if (name === 'manhã/tarde' || name === 'manha/tarde') {
    return ['Manhã', 'Tarde'];
  }
  
  if (name === 'tarde/noite') {
    return ['Tarde', 'Noite'];
  }
  
  // For 'Manhã', 'Tarde', 'Noite' and any other individual shift
  return [shiftName];
}
