import { useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { genId } from '../utils/helpers';
import { cleanName, sameName, sortSubstances, defaultSubstanceEntries } from '../utils/substances';

// A lista de substâncias da pessoa e o que se pode fazer com ela.
// Vive na coleção cifrada `substances` (ver utils/substances.js).
export function useSubstances() {
  const { substances: raw, addItem, updateItem, deleteItem } = useData();
  const substances = useMemo(() => sortSubstances(raw), [raw]);

  const addSubstance = useCallback(async (rawName) => {
    const name = cleanName(rawName);
    if (!name) return null;
    const existing = substances.find(s => sameName(s.name, name));
    if (existing) return existing;
    return addItem('substances', { id: genId(), name, isDefault: false, createdAt: new Date().toISOString() });
  }, [substances, addItem]);

  const removeSubstance = useCallback((id) => deleteItem('substances', id), [deleteItem]);

  // Só uma pode ser a "por defeito"; null = nenhuma (o registo rápido fica sem substância).
  const setDefaultSubstance = useCallback(async (id) => {
    for (const s of substances) {
      const want = s.id === id;
      if (Boolean(s.isDefault) !== want) await updateItem('substances', s.id, { isDefault: want });
    }
  }, [substances, updateItem]);

  const defaultEntries = useMemo(() => defaultSubstanceEntries(substances), [substances]);

  return { substances, addSubstance, removeSubstance, setDefaultSubstance, defaultEntries };
}
