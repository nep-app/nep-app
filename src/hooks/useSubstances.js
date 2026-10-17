import { useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { genId, getTodayKey } from '../utils/helpers';
import { cleanName, sameName, sortSubstances, defaultSubstanceEntries, dayBefore } from '../utils/substances';

// Deixar de ser principal a partir de `from` (null = desde sempre): o
// período até à véspera fica guardado, para o passado não mudar.
const closePrincipal = (s, from) => {
  const history = [...(s.principalHistory || [])];
  const to = from ? dayBefore(from) : null;
  if (to && (!s.principalSince || to >= s.principalSince)) history.push({ from: s.principalSince || null, to });
  return { isDefault: false, principalSince: null, principalHistory: history };
};

// A lista de substâncias da pessoa e o que se pode fazer com ela.
// Vive na coleção cifrada `substances` (ver utils/substances.js).
export function useSubstances() {
  const { substances: raw, addItem, updateItem, deleteItem } = useData();
  const substances = useMemo(() => sortSubstances(raw), [raw]);
  const all = useMemo(() => (raw || []).filter(s => s && !s.deleted), [raw]);

  const addSubstance = useCallback(async (rawName) => {
    const name = cleanName(rawName);
    if (!name) return null;
    const existing = all.find(s => sameName(s.name, name));
    if (existing) {
      if (existing.archived) await updateItem('substances', existing.id, { archived: false });
      return existing;
    }
    return addItem('substances', { id: genId(), name, isDefault: false, createdAt: new Date().toISOString() });
  }, [all, addItem, updateItem]);

  // Só uma pode ser a principal; id null = nenhuma (conta tudo).
  // `from` = 'YYYY-MM-DD' a partir de quando vale; null = desde sempre
  // (aí muda também o passado).
  const setDefaultSubstance = useCallback(async (id, from = getTodayKey()) => {
    const current = all.find(s => s.isDefault && !s.archived);
    if ((current?.id || null) === (id || null)) return;
    if (current) await updateItem('substances', current.id, closePrincipal(current, from));
    if (id) await updateItem('substances', id, { isDefault: true, principalSince: from || null, archived: false });
  }, [all, updateItem]);

  // Tirar da lista. Se já foi principal, fica guardada (escondida) com as
  // datas — senão os dias em que foi principal passavam a contar de outra forma.
  const removeSubstance = useCallback(async (id) => {
    const s = all.find(x => x.id === id);
    if (!s) return;
    if (s.isDefault) {
      await updateItem('substances', id, { ...closePrincipal(s, getTodayKey()), archived: true });
    } else if ((s.principalHistory || []).length > 0) {
      await updateItem('substances', id, { archived: true });
    } else {
      await deleteItem('substances', id);
    }
  }, [all, updateItem, deleteItem]);

  const defaultEntries = useMemo(() => defaultSubstanceEntries(substances), [substances]);

  return { substances, allSubstances: all, addSubstance, removeSubstance, setDefaultSubstance, defaultEntries };
}
