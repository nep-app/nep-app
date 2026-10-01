/**
 * Serviço de Export Completo de Dados
 *
 * ⚠️ REGRA: esta lista TEM de cobrir todas as tabelas de dados de src/db/localDB.js.
 * Durante meses exportou 7 das 11 e ficaram de fora as PESAGENS, os registos de
 * saúde e o "surfar o impulso". Como as pesagens são a principal fonte de mg
 * desde que existem, os backups pareciam completos e não eram: meses inteiros
 * sem uma única dose, quando a pessoa tinha registado todos os dias — só noutro
 * sítio. Um backup que falha em silêncio é pior do que não haver backup.
 * Ao criar uma tabela nova, acrescentar aqui E em IMPORTABLE_COLLECTIONS E na
 * chamada em App.jsx.
 */

// Todas as coleções de dados, com a descrição que vai no ficheiro.
const EXPORTED_COLLECTIONS = [
  ['consumptions',     'Cada consumo registado (data/hora e notas)'],
  ['cycles',           'Ciclos de sono/vigília com bedtime, horas dormidas e gatilhos'],
  ['dailyLogs',        'Dosagem total diária em mg registada à mão'],
  ['weighings',        'Pesagens do saco — a principal fonte de mg/dia. NÃO era exportada até 28-09-2026.'],
  ['wellbeingLogs',    'Humor, energia, autocuidado (água, descanso, social, alimentação) e emoções'],
  ['reflections',      'Reflexões escritas'],
  ['thoughts',         'Pensamentos registados'],
  ['goals',            'Objetivos definidos'],
  ['urgeEvents',       'Momentos de "surfar o impulso". NÃO era exportada até 28-09-2026.'],
  ['healthLogs',       'Registos de saúde/sintomas. NÃO era exportada até 28-09-2026.'],
  ['copingStrategies', 'Estratégias de coping (pode estar vazia)'],
];

/**
 * Exporta todos os dados em formato JSON
 * @param {Object} data - Objeto com todas as coleções
 * @returns {string} - JSON formatado
 */
export function exportAllDataToJSON(data) {
  const collections = {};
  let totalRecords = 0;
  const missing = [];

  for (const [name, description] of EXPORTED_COLLECTIONS) {
    const items = Array.isArray(data[name]) ? data[name] : [];
    // Quem chama TEM de passar todas as coleções. Se faltar alguma, isso fica
    // escrito no próprio ficheiro em vez de desaparecer sem ninguém notar.
    if (!(name in data)) missing.push(name);
    collections[name] = { count: items.length, data: items, description };
    totalRecords += items.length;
  }

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '2.0',
      appName: 'NEP Harm Reduction Tracker',
      totalRecords,
      collectionsIncluded: EXPORTED_COLLECTIONS.map(([n]) => n),
      // ⚠️ PARA QUEM ANALISAR ISTO FORA DO APARELHO:
      // os `timestamp` estão em UTC; o campo `date` é a chave do dia em hora
      // LOCAL. Para contas por hora do dia, converter para este fuso — ou usar
      // o `date`. Portugal muda de UTC+0 (inverno) para UTC+1 (verão), por isso
      // o desvio NÃO é constante ao longo do ficheiro: uma tabela de "a que
      // horas faço o quê" calculada sobre o timestamp em bruto mistura dois
      // relógios e desloca metade do ano numa hora.
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } })(),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      timestampsAreUTC: true,
      dateFieldIsLocalDay: true,
      ...(missing.length > 0 ? { warningNotProvided: missing } : {}),
    },
    collections,
  };

  return JSON.stringify(exportData, null, 2);
}

// Coleções que sabemos importar — derivadas da lista de export, para não
// voltarem a divergir. Um backup que exporta mais do que consegue restaurar é
// tão inútil como um que não exporta.
const IMPORTABLE_COLLECTIONS = EXPORTED_COLLECTIONS.map(([name]) => name);

/**
 * Lê e valida um ficheiro de backup JSON (o mesmo formato que exportamos).
 * Aceita o formato novo ({ collections: { nome: { data: [...] } } }) e um
 * formato simples ({ nome: [...] }) por robustez.
 * NÃO apaga nada: os registos são adicionados/atualizados por id (ver import
 * no App). Devolve { collections: { nome: [itens] }, total }.
 * Lança erro claro se o ficheiro não for um backup válido.
 * @param {string} text - Conteúdo do ficheiro
 */
export function parseImportJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('INVALID_JSON');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('INVALID_JSON');
  }

  const source = parsed.collections && typeof parsed.collections === 'object'
    ? parsed.collections
    : parsed;

  const collections = {};
  let total = 0;

  for (const name of IMPORTABLE_COLLECTIONS) {
    const entry = source[name];
    // Formato novo: { data: [...] }. Formato simples: [...]
    const arr = Array.isArray(entry) ? entry
      : (entry && Array.isArray(entry.data) ? entry.data : null);
    if (!arr) continue;

    // Só objetos; garante um id (gera se faltar, para não perder o registo).
    const clean = arr
      .filter(it => it && typeof it === 'object' && !Array.isArray(it))
      .map((it, i) => ({
        ...it,
        id: it.id || `import_${name}_${Date.now()}_${i}`,
      }));

    if (clean.length > 0) {
      collections[name] = clean;
      total += clean.length;
    }
  }

  if (total === 0) {
    throw new Error('NO_RECORDS');
  }

  return { collections, total };
}

/**
 * Faz download de um ficheiro JSON
 * @param {string} jsonString - String JSON
 * @param {string} filename - Nome do ficheiro
 */
export function downloadJSON(jsonString, filename = 'nep-backup-completo.json') {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta tudo e faz download
 * @param {Object} data - Todas as coleções
 */
export function exportAndDownloadAll(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `nep-backup-completo-${timestamp}.json`;

  const jsonString = exportAllDataToJSON(data);
  downloadJSON(jsonString, filename);

  // Retornar estatísticas
  const parsed = JSON.parse(jsonString);
  return {
    success: true,
    filename,
    totalRecords: parsed.metadata.totalRecords,
    collections: Object.keys(parsed.collections).map(key => ({
      name: key,
      count: parsed.collections[key].count
    }))
  };
}

/**
 * Exporta para CSV melhorado (compatibilidade)
 * Mantém função antiga mas melhorada
 */
export function exportToCSV(data) {
  const {
    consumptions = [],
    cycles = [],
    dailyLogs = [],
    wellbeingLogs = [],
    reflections = [],
    thoughts = [],
    goals = []
  } = data;

  // Wraps text in quotes, escapes internal quotes, and neutralises formula injection
  const csvCell = (val) => {
    const s = String(val == null ? '' : val).replace(/"/g, '""');
    return /^[=+\-@\t\n]/.test(s) ? `"'${s}"` : `"${s}"`;
  };

  // CSV para consumptions
  let csv = 'CONSUMPTIONS\n';
  csv += 'Date,Time,Substance,Amount,Unit,Notes\n';
  consumptions.forEach(c => {
    const date = c.date || '';
    const time = c.timestamp ? new Date(c.timestamp).toLocaleTimeString('pt-PT') : '';
    csv += `${date},${time},${csvCell(c.substance)},${csvCell(c.amount)},${csvCell(c.unit)},${csvCell(c.notes)}\n`;
  });

  // CSV para cycles (SONO)
  csv += '\n\nCYCLES (SONO)\n';
  csv += 'Date,Bedtime,Sleep Hours,Triggers,Notes\n';
  cycles.forEach(c => {
    const triggers = (c.triggers || []).join('; ');
    csv += `${c.date || ''},${c.bedtime || ''},${c.sleep != null ? c.sleep : ''},${csvCell(triggers)},${csvCell(c.notes)}\n`;
  });

  // CSV para wellbeingLogs
  csv += '\n\nWELLBEING LOGS\n';
  csv += 'Date,Mood,Energy,WaterGlasses,ExerciseType,ExerciseDuration,NapDuration,Social,Food,Symptoms,Emotions,IsAtypical,AtypicalReason,Notes\n';
  wellbeingLogs.forEach(w => {
    const emotions = (w.emotions || []).join('; ');
    const symptoms = (w.symptoms || []).join('; ');
    const waterVal = w.waterGlasses != null ? w.waterGlasses : (w.water ? 'Sim' : 'Não');
    const restVal = w.exerciseType || (w.exerciseDuration > 0 ? `${w.exerciseDuration}min` : (w.rest ? 'Sim' : 'Não'));
    csv += `${w.date || ''},${w.mood || ''},${w.energy || ''},${waterVal},${csvCell(w.exerciseType || restVal)},${w.exerciseDuration || ''},${w.napDuration || ''},${w.social ? 'Sim' : 'Não'},${w.food ? 'Sim' : 'Não'},${csvCell(symptoms)},${csvCell(emotions)},${w.isAtypical ? 'Sim' : 'Não'},${csvCell(w.atypicalReason)},${csvCell(w.notes)}\n`;
  });

  // CSV para dailyLogs
  csv += '\n\nDAILY LOGS (DOSAGEM)\n';
  csv += 'Date,Total MG,Notes\n';
  dailyLogs.forEach(d => {
    csv += `${d.date || ''},${d.mg || ''},${csvCell(d.notes)}\n`;
  });

  // CSV para reflections
  csv += '\n\nREFLECTIONS\n';
  csv += 'Date,Text,Sentiment\n';
  reflections.forEach(r => {
    csv += `${r.date || ''},${csvCell(r.text)},${r.sentiment || ''}\n`;
  });

  // CSV para thoughts
  csv += '\n\nTHOUGHTS\n';
  csv += 'Date,Thought,Notes\n';
  thoughts.forEach(t => {
    csv += `${t.date || ''},${csvCell(t.thought)},${csvCell(t.notes)}\n`;
  });

  // CSV para goals
  csv += '\n\nGOALS\n';
  csv += 'Title,Description,Created At,Completed,Progress\n';
  goals.forEach(g => {
    csv += `${csvCell(g.title)},${csvCell(g.description)},${g.createdAt || ''},${g.completed ? 'Sim' : 'Não'},${g.progress || 0}%\n`;
  });

  return csv;
}

/**
 * Download CSV
 */
export function downloadCSV(csvString, filename = 'nep-backup-completo.csv') {
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
