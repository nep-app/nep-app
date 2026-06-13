/**
 * Serviço de Export Completo de Dados
 *
 * Exporta TODAS as coleções em formato JSON
 * Inclui: consumptions, cycles, dailyLogs, wellbeingLogs, reflections, thoughts, goals
 */

/**
 * Exporta todos os dados em formato JSON
 * @param {Object} data - Objeto com todas as coleções
 * @returns {string} - JSON formatado
 */
export function exportAllDataToJSON(data) {
  const {
    consumptions = [],
    cycles = [],
    dailyLogs = [],
    wellbeingLogs = [],
    reflections = [],
    thoughts = [],
    goals = [],
    copingStrategies = []
  } = data;

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0',
      appName: 'NEP Harm Reduction Tracker',
      totalRecords: consumptions.length + cycles.length + dailyLogs.length +
                    wellbeingLogs.length + reflections.length + thoughts.length + goals.length
    },
    collections: {
      consumptions: {
        count: consumptions.length,
        data: consumptions
      },
      cycles: {
        count: cycles.length,
        data: cycles,
        description: 'Ciclos de sono/vigília com bedtime, horas dormidas e gatilhos'
      },
      dailyLogs: {
        count: dailyLogs.length,
        data: dailyLogs,
        description: 'Dosagem total diária em mg'
      },
      wellbeingLogs: {
        count: wellbeingLogs.length,
        data: wellbeingLogs,
        description: 'Humor, energia, autocuidado (água, descanso, social, alimentação) e emoções'
      },
      reflections: {
        count: reflections.length,
        data: reflections,
        description: 'Reflexões escritas'
      },
      thoughts: {
        count: thoughts.length,
        data: thoughts,
        description: 'Pensamentos registados'
      },
      goals: {
        count: goals.length,
        data: goals,
        description: 'Objetivos definidos'
      },
      copingStrategies: {
        count: copingStrategies.length,
        data: copingStrategies,
        description: 'Estratégias de coping (pode estar vazia)'
      }
    }
  };

  return JSON.stringify(exportData, null, 2);
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
    csv += `${date},${time},${csvCell(c.substance)},${c.amount || ''},${csvCell(c.unit)},${csvCell(c.notes)}\n`;
  });

  // CSV para cycles (SONO)
  csv += '\n\nCYCLES (SONO)\n';
  csv += 'Date,Bedtime,Sleep Hours,Triggers,Notes\n';
  cycles.forEach(c => {
    const triggers = (c.triggers || []).join('; ');
    csv += `${c.date || ''},${c.bedtime || ''},${c.sleep || ''},${csvCell(triggers)},${csvCell(c.notes)}\n`;
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
