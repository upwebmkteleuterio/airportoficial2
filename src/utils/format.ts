export const formatPhone = (value: string) => {
  if (!value) return '';
  
  // Remove tudo que não é dígito
  let r = value.replace(/\D/g, '');
  
  if (r.length > 11) {
    r = r.slice(0, 11);
  }

  // Máscara
  if (r.length > 10) {
    // (XX) XXXXX-XXXX
    r = r.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (r.length > 5) {
    // (XX) XXXX-XXXX
    r = r.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (r.length > 2) {
    // (XX) XXXX
    r = r.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (r.length > 0) {
    r = r.replace(/^(\d*)/, '($1');
  }

  return r;
};
