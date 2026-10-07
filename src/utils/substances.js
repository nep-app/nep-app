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
export const sortSubstances = (list) =>
  [...(list || [])].filter(s => s && !s.deleted && s.name)
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

// ── O que conta para os cálculos ─────────────────────────────────────────────
// Só a substância PRINCIPAL (a "por defeito") entra nas contas — análises,
// metas, avisos, mg, investigação. Um registo SEM substância (todos os antigos,
// de antes de existir a lista) conta como sendo dela. Um registo só com outras
// (ex.: só medicação) aparece no Histórico mas fica fora das contas.
// Sem principal escolhida, conta tudo, como sempre contou.
export const countsForPrincipal = (consumption, principalName) => {
  if (!principalName) return true;
  const subs = consumption?.substances;
  if (!Array.isArray(subs) || subs.length === 0) return true;
  return subs.some(e => sameName(e?.name, principalName));
};

export const countedConsumptions = (consumptions, substances) => {
  const principal = getDefaultSubstance(substances);
  if (!principal) return consumptions || [];
  return (consumptions || []).filter(c => countsForPrincipal(c, principal.name));
};
