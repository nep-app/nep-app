import { getDateKeyFromItem, safeToISODate } from './helpers';

// ===== SUBSTÂNCIAS =====
// Cada pessoa tem a sua lista (coleção cifrada `substances`: { id, name,
// isDefault, createdAt }). Um consumo pode levar `substances: [{ name, amount }]`.
//
// Guarda-se o NOME no consumo (e não o id da lista) de propósito: se a pessoa
// tirar uma substância da lista, os registos antigos continuam a dizer o que
// foi. A lista serve só para escolher depressa.
//
// O botão de registo rápido continua a ser um toque: se houver uma substância
// "por defeito", o consumo leva-a logo; muda-se depois, ao editar o registo.
//
// Privacidade: nomes e quantidades são texto escrito pela pessoa. Ficam
// cifrados com o resto do registo e NUNCA entram no modo de investigação.

export const MAX_NAME = 40;
export const MAX_AMOUNT = 24;

const squash = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export const cleanName = (s) => squash(s).slice(0, MAX_NAME);
export const cleanAmount = (s) => squash(s).slice(0, MAX_AMOUNT);

export const sameName = (a, b) => cleanName(a).toLocaleLowerCase() === cleanName(b).toLocaleLowerCase();

// Ordem em que foram acrescentadas (a lista é da pessoa; não se reordena por uso).
// As "arquivadas" (tiradas da lista depois de terem sido principais) não
// aparecem para escolher, mas guardam as datas em que foram principais.
export const sortSubstances = (list) =>
  [...(list || [])].filter(s => s && !s.deleted && !s.archived && s.name)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

export const getDefaultSubstance = (list) => sortSubstances(list).find(s => s.isDefault) || null;

// O que um consumo novo leva quando não se escolhe nada: a "por defeito", ou nada.
export const defaultSubstanceEntries = (list) => {
  const d = getDefaultSubstance(list);
  return d ? [{ name: d.name }] : [];
};

// Limpa o que vem do formulário: tira vazios e repetidos, corta tamanhos.
export const cleanEntries = (entries) => {
  const out = [];
  for (const e of entries || []) {
    const name = cleanName(e?.name);
    if (!name || out.some(o => sameName(o.name, name))) continue;
    const amount = cleanAmount(e?.amount);
    out.push(amount ? { name, amount } : { name });
  }
  return out;
};

// "Rivotril 1 mg · Vinho do Porto 1 cálice"
export const formatSubstances = (entries) =>
  cleanEntries(entries).map(e => (e.amount ? `${e.name} ${e.amount}` : e.name)).join(' · ');

// ── Qual era a principal em cada dia ─────────────────────────────────────────
// Mudar a principal NÃO reescreve o passado (como nas metas): a actual vale
// desde `principalSince` ('YYYY-MM-DD'; sem data = desde sempre) e cada
// substância guarda em `principalHistory: [{ from, to }]` os períodos em que
// já foi principal (from null = desde sempre). Num dia sem principal, conta tudo.
export const dayBefore = (day) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return safeToISODate(d);
};

export const principalPeriods = (list) => {
  const out = [];
  for (const s of list || []) {
    if (!s || s.deleted || !s.name) continue;
    for (const p of s.principalHistory || []) {
      if (p && p.to) out.push({ name: s.name, from: p.from || null, to: p.to });
    }
    if (s.isDefault && !s.archived) out.push({ name: s.name, from: s.principalSince || null, to: null });
  }
  return out.sort((a, b) => String(a.from || '').localeCompare(String(b.from || '')));
};

// A actual ganha a partir do dia em que começou; antes disso, os períodos antigos.
export const principalNameOn = (periods, day) => {
  const current = periods.find(p => !p.to);
  if (!day) return current ? current.name : null;
  if (current && (!current.from || day >= current.from)) return current.name;
  const past = periods.find(p => p.to && (!p.from || day >= p.from) && day <= p.to);
  return past ? past.name : null;
};

// ── O que conta para os cálculos ─────────────────────────────────────────────
// Só a substância PRINCIPAL (do dia do registo) entra nas contas — análises,
// metas, avisos, mg, investigação. Um registo SEM substância (todos os antigos,
// de antes de existir a lista) conta como sendo dela. Um registo só com outras
// (ex.: só medicação) aparece no Histórico mas fica fora das contas.
// Sem principal nesse dia, conta tudo, como sempre contou.
export const countsForPrincipal = (consumption, principalName) => {
  if (!principalName) return true;
  const subs = consumption?.substances;
  if (!Array.isArray(subs) || subs.length === 0) return true;
  return subs.some(e => sameName(e?.name, principalName));
};

export const countedConsumptions = (consumptions, substances) => {
  const periods = principalPeriods(substances);
  if (periods.length === 0) return consumptions || [];
  return (consumptions || []).filter(c => countsForPrincipal(c, principalNameOn(periods, getDateKeyFromItem(c))));
};
