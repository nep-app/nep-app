import { useEffect, useState } from 'react';
import { getWordForm } from '../constants/emotions';

// Género das palavras ("cansada" · "cansado" · "cansada/o"), escolhido nas
// Definições. Só visual. Atualiza quando se muda nas Definições.
export const useWordForm = () => {
  const [form, setForm] = useState(getWordForm);
  useEffect(() => {
    const on = () => setForm(getWordForm());
    window.addEventListener('nep-word-form', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('nep-word-form', on); window.removeEventListener('storage', on); };
  }, []);
  return form;
};

export default useWordForm;
