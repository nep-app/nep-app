import React, { useState, useMemo } from 'react';
import * as Icons from '../Icons';
import { useData } from '../../contexts/DataContext';
import { safeDate } from '../../utils/helpers';

const SECTIONS = [
  { id: 'consumptions', label: 'Consumos individuais', emoji: '💊' },
  { id: 'dailyLogs',    label: 'Registos diários (mg)',  emoji: '📋' },
  { id: 'cycles',       label: 'Ciclos / Pausas',        emoji: '🌙' },
  { id: 'wellbeing',    label: 'Estado de bem-estar',    emoji: '💚' },
  { id: 'reflections',  label: 'Reflexões / Diário',     emoji: '📝' },
  { id: 'thoughts',     label: 'Pensamentos',            emoji: '💭' },
];

const PERIODS = [
  { id: '7d',     label: 'Últimos 7 dias' },
  { id: '30d',    label: 'Últimos 30 dias' },
  { id: '90d',    label: 'Últimos 3 meses' },
  { id: '180d',   label: 'Últimos 6 meses' },
  { id: '365d',   label: 'Último ano' },
  { id: 'all',    label: 'Tudo' },
  { id: 'custom', label: 'Período personalizado' },
];

const fmtDate = (val) => {
  const d = safeDate(val);
  return d ? d.toLocaleDateString('pt-PT') : '—';
};

const fmtDateTime = (val) => {
  const d = safeDate(val);
  if (!d) return '—';
  return `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
};

const filterByPeriod = (items, period, customFrom, customTo, dateField = 'timestamp') => {
  const now = new Date();
  let from, to;

  if (period === 'all') return items;

  if (period === 'custom') {
    from = customFrom ? new Date(customFrom) : null;
    to   = customTo   ? new Date(customTo + 'T23:59:59') : null;
  } else {
    const days = parseInt(period);
    from = new Date(now);
    from.setDate(from.getDate() - days);
    to = now;
  }

  return items.filter(item => {
    const d = safeDate(item[dateField] || item.timestamp || item.date);
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
};

// ─── CSV helpers ────────────────────────────────────────────────────────────

const csvCell = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
};

const csvRow = (cols) => cols.map(csvCell).join(',');

const downloadCSV = (filename, rows) => {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const content = bom + rows.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Compute cycle end dates: each cycle ends when the next one starts
const computeCycleEnds = (cycles) => {
  const sorted = [...cycles].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return sorted.map((c, i) => ({
    ...c,
    _computedEnd: i < sorted.length - 1 ? sorted[i + 1].timestamp : null,
  }));
};

const buildCSVs = (data, selected) => {
  const files = [];

  if (selected.consumptions && data.consumptions.length > 0) {
    const rows = [csvRow(['Data', 'Hora', 'Quantidade', 'Notas'])];
    data.consumptions.forEach(c => {
      const d = safeDate(c.timestamp);
      rows.push(csvRow([
        d ? d.toLocaleDateString('pt-PT') : '',
        d ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '',
        c.amount ? `${c.amount} ${c.unit || 'mg'}` : '',
        c.notes || '',
      ]));
    });
    files.push({ name: 'consumos.csv', rows });
  }

  if (selected.dailyLogs && data.dailyLogs.length > 0) {
    const rows = [csvRow(['Data', 'Dose (mg)', 'Nº consumos', 'Notas'])];
    data.dailyLogs.forEach(l => {
      rows.push(csvRow([
        fmtDate(l.date || l.timestamp),
        l.mg || '',
        l.times != null ? l.times : '',
        l.notes || '',
      ]));
    });
    files.push({ name: 'registos_diarios.csv', rows });
  }

  if (selected.cycles && data.cycles.length > 0) {
    const cyclesWithEnd = computeCycleEnds(data.cycles);
    const rows = [csvRow(['Início', 'Fim', 'Duração (dias)', 'Hora deitar', 'Horas sono', 'Gatilhos', 'Notas'])];
    cyclesWithEnd.forEach(c => {
      const start = safeDate(c.timestamp);
      const end   = c._computedEnd ? safeDate(c._computedEnd) : null;
      const days  = (start && end) ? Math.round((end - start) / 86400000) : '';
      rows.push(csvRow([
        start ? start.toLocaleDateString('pt-PT') : '',
        end   ? end.toLocaleDateString('pt-PT')   : 'Em curso',
        days,
        c.bedtime || '',
        c.sleep ? `${c.sleep}h` : '',
        (c.triggers || []).join('; '),
        c.notes || '',
      ]));
    });
    files.push({ name: 'ciclos.csv', rows });
  }

  if (selected.wellbeing && data.wellbeingLogs.length > 0) {
    const rows = [csvRow(['Data', 'Humor (1-10)', 'Energia (1-10)', 'Água', 'Descanso', 'Alimentação', 'Social', 'Emoções', 'Notas'])];
    data.wellbeingLogs.forEach(w => {
      rows.push(csvRow([
        fmtDateTime(w.timestamp || w.date),
        w.mood   || '',
        w.energy || '',
        w.water  ? 'Sim' : 'Não',
        w.rest   ? 'Sim' : 'Não',
        w.food   ? 'Sim' : 'Não',
        w.social ? 'Sim' : 'Não',
        (w.emotions || []).join('; '),
        w.notes || '',
      ]));
    });
    files.push({ name: 'bem_estar.csv', rows });
  }

  if (selected.reflections && data.reflections.length > 0) {
    const rows = [csvRow(['Data', 'Pergunta', 'Resposta'])];
    data.reflections.forEach(r => {
      rows.push(csvRow([fmtDateTime(r.timestamp || r.date), r.question || '', r.answer || '']));
    });
    files.push({ name: 'reflexoes.csv', rows });
  }

  if (selected.thoughts && data.thoughts.length > 0) {
    const rows = [csvRow(['Data', 'Conteúdo'])];
    data.thoughts.forEach(t => {
      rows.push(csvRow([fmtDateTime(t.timestamp || t.date), t.content || '']));
    });
    files.push({ name: 'pensamentos.csv', rows });
  }

  return files;
};

// ─── PDF / printable HTML ────────────────────────────────────────────────────

const buildPrintHTML = (data, selected, period, customFrom, customTo) => {
  const periodLabel = PERIODS.find(p => p.id === period)?.label || period;
  const now = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });

  // Compute cycle end dates
  const cyclesWithEnd = computeCycleEnds(data.cycles || []);

  // Collect all entries with a dateKey (YYYY-MM-DD) and a sort timestamp
  const allEntries = [];

  if (selected.consumptions) {
    data.consumptions.forEach(c => {
      const d = safeDate(c.timestamp);
      if (!d) return;
      const dateKey = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const detail = [
        c.amount ? `${c.amount} ${c.unit || 'mg'}` : null,
        c.notes || null,
      ].filter(Boolean).join(' — ') || '—';
      allEntries.push({ dateKey, sort: d, row: ['💊 Consumo', time, detail] });
    });
  }

  if (selected.dailyLogs) {
    data.dailyLogs.forEach(l => {
      const d = safeDate(l.date || l.timestamp);
      if (!d) return;
      const dateKey = l.date || d.toISOString().split('T')[0];
      const detail = [
        l.mg ? `${l.mg} mg` : null,
        l.times != null ? `${l.times}× consumos` : null,
        l.notes || null,
      ].filter(Boolean).join(' — ') || '—';
      allEntries.push({ dateKey, sort: d, row: ['📋 Registo diário', '—', detail] });
    });
  }

  if (selected.cycles) {
    cyclesWithEnd.forEach(c => {
      const d = safeDate(c.timestamp);
      if (!d) return;
      const dateKey = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const endD = c._computedEnd ? safeDate(c._computedEnd) : null;
      const detail = [
        endD ? `Fim: ${endD.toLocaleDateString('pt-PT')}` : 'Em curso',
        c.sleep ? `Sono: ${c.sleep}h` : null,
        (c.triggers || []).length ? `Gatilhos: ${(c.triggers || []).join(', ')}` : null,
        c.notes || null,
      ].filter(Boolean).join(' — ') || '—';
      allEntries.push({ dateKey, sort: d, row: ['🌙 Ciclo', time, detail] });
    });
  }

  if (selected.wellbeing) {
    data.wellbeingLogs.forEach(w => {
      const d = safeDate(w.timestamp || w.date);
      if (!d) return;
      const dateKey = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const detail = [
        w.mood   ? `Humor: ${w.mood}/10`   : null,
        w.energy ? `Energia: ${w.energy}/10` : null,
        [w.water && 'Água', w.rest && 'Descanso', w.food && 'Alimentação', w.social && 'Social'].filter(Boolean).join(', ') || null,
        (w.emotions || []).length ? (w.emotions || []).join(', ') : null,
        w.notes || null,
      ].filter(Boolean).join(' — ') || '—';
      allEntries.push({ dateKey, sort: d, row: ['💚 Bem-estar', time, detail] });
    });
  }

  if (selected.reflections) {
    data.reflections.forEach(r => {
      const d = safeDate(r.timestamp || r.date);
      if (!d) return;
      const dateKey = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const detail = [r.question, r.answer].filter(Boolean).join(': ') || '—';
      allEntries.push({ dateKey, sort: d, row: ['📝 Reflexão', time, detail] });
    });
  }

  if (selected.thoughts) {
    data.thoughts.forEach(t => {
      const d = safeDate(t.timestamp || t.date);
      if (!d) return;
      const dateKey = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      allEntries.push({ dateKey, sort: d, row: ['💭 Pensamento', time, t.content || '—'] });
    });
  }

  // Group by date and sort dates descending (newest first)
  const byDate = {};
  allEntries.forEach(entry => {
    if (!byDate[entry.dateKey]) byDate[entry.dateKey] = [];
    byDate[entry.dateKey].push(entry);
  });

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  let content = '';
  if (sortedDates.length === 0) {
    content = '<p>Sem dados para o período selecionado.</p>';
  } else {
    sortedDates.forEach(dateKey => {
      const entries = byDate[dateKey].sort((a, b) => a.sort - b.sort);
      const dayLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-PT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const dataRows = entries.map(e =>
        `<tr>${e.row.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`
      ).join('');
      content += `
      <div class="section">
        <h2>${dayLabel}</h2>
        <table>
          <thead><tr><th>Tipo</th><th>Hora</th><th>Detalhes</th></tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>`;
    });
  }

  const rangeLabel = period === 'custom'
    ? `${customFrom ? new Date(customFrom).toLocaleDateString('pt-PT') : '…'} — ${customTo ? new Date(customTo).toLocaleDateString('pt-PT') : '…'}`
    : periodLabel;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Relatório de Saúde</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; padding: 20mm 18mm; }
  header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 24px; }
  header h1 { font-size: 20pt; margin-bottom: 4px; }
  header p { color: #555; font-size: 10pt; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { font-size: 13pt; border-left: 4px solid #555; padding-left: 10px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #f0f0f0; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-weight: bold; }
  td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print {
    body { padding: 10mm 12mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<header>
  <h1>Relatório de Saúde</h1>
  <p>Período: <strong>${rangeLabel}</strong> &nbsp;·&nbsp; Gerado em ${now}</p>
  <p style="margin-top:6px;font-size:9.5pt;color:#777;">
    Este relatório foi gerado automaticamente. Partilha com o teu profissional de saúde.
  </p>
</header>
${content}
<div class="no-print" style="margin-top:32px;text-align:center;">
  <button onclick="window.print()" style="padding:10px 28px;font-size:12pt;cursor:pointer;border:none;background:#333;color:#fff;border-radius:6px;">
    🖨️ Imprimir / Guardar como PDF
  </button>
</div>
</body>
</html>`;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const ExportModal = ({ isOpen, onClose }) => {
  const { consumptions, dailyLogs, cycles, wellbeingLogs, reflections, thoughts } = useData();

  const [period,     setPeriod]     = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [selected,   setSelected]   = useState({
    consumptions: true,
    dailyLogs:    true,
    cycles:       true,
    wellbeing:    true,
    reflections:  false,
    thoughts:     false,
  });

  const toggleSection = (id) => setSelected(s => ({ ...s, [id]: !s[id] }));

  const filteredData = useMemo(() => ({
    consumptions: filterByPeriod(consumptions,  period, customFrom, customTo, 'timestamp'),
    dailyLogs:    filterByPeriod(dailyLogs,     period, customFrom, customTo, 'date'),
    cycles:       filterByPeriod(cycles,        period, customFrom, customTo, 'timestamp'),
    wellbeingLogs:filterByPeriod(wellbeingLogs, period, customFrom, customTo, 'timestamp'),
    reflections:  filterByPeriod(reflections,   period, customFrom, customTo, 'timestamp'),
    thoughts:     filterByPeriod(thoughts,      period, customFrom, customTo, 'timestamp'),
  }), [consumptions, dailyLogs, cycles, wellbeingLogs, reflections, thoughts, period, customFrom, customTo]);

  const counts = {
    consumptions: filteredData.consumptions.length,
    dailyLogs:    filteredData.dailyLogs.length,
    cycles:       filteredData.cycles.length,
    wellbeing:    filteredData.wellbeingLogs.length,
    reflections:  filteredData.reflections.length,
    thoughts:     filteredData.thoughts.length,
  };

  const handlePDF = () => {
    const html = buildPrintHTML(filteredData, selected, period, customFrom, customTo);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleCSV = () => {
    const csvData = {
      consumptions:  filteredData.consumptions,
      dailyLogs:     filteredData.dailyLogs,
      cycles:        filteredData.cycles,
      wellbeingLogs: filteredData.wellbeingLogs,
      reflections:   filteredData.reflections,
      thoughts:      filteredData.thoughts,
    };
    const files = buildCSVs(csvData, {
      consumptions: selected.consumptions,
      dailyLogs:    selected.dailyLogs,
      cycles:       selected.cycles,
      wellbeing:    selected.wellbeing,
      reflections:  selected.reflections,
      thoughts:     selected.thoughts,
    });
    files.forEach((f, i) => {
      setTimeout(() => downloadCSV(f.name, f.rows), i * 300);
    });
  };

  const anySelected = Object.values(selected).some(Boolean);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-gray-800 border-gray-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">📤 Exportar dados</h3>
          <button onClick={onClose} className="text-gray-400 hover:opacity-70 transition-opacity">
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        {/* Period */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Período</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {PERIODS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {period === 'custom' && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">De</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Até</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">O que incluir</label>
          <div className="space-y-2">
            {SECTIONS.map(s => {
              const count = counts[s.id === 'wellbeing' ? 'wellbeing' : s.id];
              return (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected[s.id]}
                    onChange={() => toggleSection(s.id)}
                    className="w-4 h-4 accent-purple-500 cursor-pointer"
                  />
                  <span className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors">
                    {s.emoji} {s.label}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {count} {count === 1 ? 'registo' : 'registos'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handlePDF}
            disabled={!anySelected}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🖨️ Gerar relatório PDF
          </button>
          <button
            onClick={handleCSV}
            disabled={!anySelected}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📊 Exportar CSV (Excel)
          </button>
          <p className="text-xs text-gray-500 text-center">
            PDF: abre uma página para imprimir ou guardar como PDF.<br />
            CSV: faz download de ficheiros para abrir no Excel.
          </p>
        </div>
      </div>
    </div>
  );
};
