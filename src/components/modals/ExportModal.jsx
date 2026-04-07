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

  const rangeLabel = period === 'custom'
    ? `${customFrom ? new Date(customFrom).toLocaleDateString('pt-PT') : '…'} — ${customTo ? new Date(customTo).toLocaleDateString('pt-PT') : '…'}`
    : periodLabel;

  // ── Summary stats ──────────────────────────────────────────────────────────
  const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const fmtN = (v, dec = 1) => v != null ? v.toFixed(dec) : null;

  const moodVals   = selected.wellbeing ? data.wellbeingLogs.map(w => parseFloat(w.mood)).filter(v => !isNaN(v)) : [];
  const energyVals = selected.wellbeing ? data.wellbeingLogs.map(w => parseFloat(w.energy)).filter(v => !isNaN(v)) : [];
  const sleepVals  = selected.cycles    ? data.cycles.map(c => parseFloat(c.sleep)).filter(v => !isNaN(v) && v > 0) : [];
  const mgVals     = selected.dailyLogs ? data.dailyLogs.map(l => parseFloat(l.mg)).filter(v => !isNaN(v) && v > 0) : [];

  const avgMood   = fmtN(avg(moodVals));
  const avgEnergy = fmtN(avg(energyVals));
  const avgSleep  = fmtN(avg(sleepVals));
  const avgMg     = mgVals.length ? Math.round(avg(mgVals)) : null;

  const emotionCounts = {};
  if (selected.wellbeing) {
    data.wellbeingLogs.forEach(w => (w.emotions || []).forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; }));
  }
  const topEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);

  const scTotal = selected.wellbeing ? data.wellbeingLogs.length : 0;
  const scDays  = selected.wellbeing ? data.wellbeingLogs.filter(w => w.water || w.rest || w.food || w.social).length : 0;
  const scPct   = scTotal > 0 ? Math.round((scDays / scTotal) * 100) : null;

  // ── Trend analysis (first half vs second half of period) ──────────────────
  const trendFor = (vals) => {
    if (vals.length < 4) return null;
    const h = Math.floor(vals.length / 2);
    const first = avg(vals.slice(0, h)), last = avg(vals.slice(-h));
    if (first == null || last == null) return null;
    const diff = last - first;
    if (Math.abs(diff) < 0.3) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };
  const moodTrend   = trendFor(moodVals);
  const energyTrend = trendFor(energyVals);
  const sleepTrend  = trendFor(sleepVals);

  const trendLabel = (t, upGood = true) => {
    if (!t) return '';
    if (t === 'stable') return '→ estável';
    if (t === 'up')  return upGood  ? '↑ a melhorar' : '↑ a aumentar';
    if (t === 'down') return upGood ? '↓ a baixar'   : '↓ a diminuir';
    return '';
  };
  const trendColor = (t, upGood = true) => {
    if (!t || t === 'stable') return '#6b7280';
    return (t === 'up') === upGood ? '#16a34a' : '#dc2626';
  };

  // ── Build stats cards ──────────────────────────────────────────────────────
  const statCards = [
    selected.consumptions && data.consumptions.length > 0
      ? { icon: '💊', value: data.consumptions.length, label: 'Consumos' } : null,
    avgMg != null
      ? { icon: '📋', value: `${avgMg}mg`, label: 'Dose média/dia' } : null,
    avgMood != null
      ? { icon: '😊', value: `${avgMood}/10`, label: 'Humor médio', trend: trendLabel(moodTrend), trendColor: trendColor(moodTrend) } : null,
    avgEnergy != null
      ? { icon: '⚡', value: `${avgEnergy}/10`, label: 'Energia média', trend: trendLabel(energyTrend), trendColor: trendColor(energyTrend) } : null,
    avgSleep != null
      ? { icon: '🌙', value: `${avgSleep}h`, label: 'Sono médio', trend: trendLabel(sleepTrend), trendColor: trendColor(sleepTrend) } : null,
    scPct != null
      ? { icon: '💚', value: `${scPct}%`, label: 'Autocuidado' } : null,
  ].filter(Boolean);

  const statsHTML = statCards.length > 0 ? `
  <section class="summary">
    <div class="section-label">Resumo do período</div>
    <div class="stat-grid">
      ${statCards.map(s => `
        <div class="stat">
          <div class="stat-icon">${s.icon}</div>
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
          ${s.trend ? `<div class="stat-trend" style="color:${s.trendColor}">${s.trend}</div>` : ''}
        </div>`).join('')}
    </div>
    ${topEmotions.length > 0 ? `
    <div class="emotions-row">
      <span class="emotions-label">Emoções mais frequentes:</span>
      ${topEmotions.map(e => `<span class="emotion-tag">${e}</span>`).join('')}
    </div>` : ''}
  </section>` : '';

  // ── Build timeline ─────────────────────────────────────────────────────────
  const cyclesWithEnd = computeCycleEnds(data.cycles || []);
  const allEntries = [];

  const push = (type, dateKey, sort, badge, time, detail) =>
    allEntries.push({ type, dateKey, sort, badge, time, detail });

  if (selected.consumptions) {
    data.consumptions.forEach(c => {
      const d = safeDate(c.timestamp); if (!d) return;
      const dk = d.toISOString().split('T')[0];
      const detail = [c.amount ? `${c.amount} ${c.unit || 'mg'}` : null, c.notes || null].filter(Boolean).join(' · ') || '—';
      push('consumption', dk, d, '💊 Consumo', d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), detail);
    });
  }
  if (selected.dailyLogs) {
    data.dailyLogs.forEach(l => {
      const d = safeDate(l.date || l.timestamp); if (!d) return;
      const dk = l.date || d.toISOString().split('T')[0];
      const detail = [l.mg ? `${l.mg} mg total` : null, l.notes || null].filter(Boolean).join(' · ') || '—';
      push('daily', dk, d, '📋 Dose diária', '—', detail);
    });
  }
  if (selected.cycles) {
    cyclesWithEnd.forEach(c => {
      const d = safeDate(c.timestamp); if (!d) return;
      const endD = c._computedEnd ? safeDate(c._computedEnd) : null;
      const detail = [
        c.bedtime ? `Deitou: ${c.bedtime}` : null,
        c.sleep ? `Sono: ${c.sleep}h` : null,
        endD ? `Até: ${endD.toLocaleDateString('pt-PT')}` : 'Em curso',
        (c.triggers || []).length ? `Gatilhos: ${c.triggers.join(', ')}` : null,
        c.notes || null,
      ].filter(Boolean).join(' · ') || '—';
      push('cycle', d.toISOString().split('T')[0], d, '🌙 Ciclo', d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), detail);
    });
  }
  if (selected.wellbeing) {
    data.wellbeingLogs.forEach(w => {
      const d = safeDate(w.timestamp || w.date); if (!d) return;
      const detail = [
        w.mood   ? `Humor ${w.mood}/10` : null,
        w.energy ? `Energia ${w.energy}/10` : null,
        [w.water && 'Água', w.rest && 'Descanso', w.food && 'Alim.', w.social && 'Social'].filter(Boolean).join(', ') || null,
        (w.emotions || []).length ? w.emotions.join(', ') : null,
        w.notes || null,
      ].filter(Boolean).join(' · ') || '—';
      push('wellbeing', d.toISOString().split('T')[0], d, '💚 Bem-estar', d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), detail);
    });
  }
  if (selected.reflections) {
    data.reflections.forEach(r => {
      const d = safeDate(r.timestamp || r.date); if (!d) return;
      push('reflection', d.toISOString().split('T')[0], d, '📝 Reflexão', d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), [r.question, r.answer].filter(Boolean).join(': ') || '—');
    });
  }
  if (selected.thoughts) {
    data.thoughts.forEach(t => {
      const d = safeDate(t.timestamp || t.date); if (!d) return;
      push('thought', d.toISOString().split('T')[0], d, '💭 Pensamento', d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), t.content || '—');
    });
  }

  const byDate = {};
  allEntries.forEach(e => { if (!byDate[e.dateKey]) byDate[e.dateKey] = []; byDate[e.dateKey].push(e); });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const TC = {
    consumption: { bg: '#f3e8ff', border: '#7c3aed', text: '#5b21b6' },
    daily:       { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8' },
    cycle:       { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
    wellbeing:   { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
    reflection:  { bg: '#fce7f3', border: '#db2777', text: '#831843' },
    thought:     { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  };

  let timelineHTML = '';
  if (sortedDates.length === 0) {
    timelineHTML = '<p style="color:#888;font-style:italic;padding:12px 0;">Sem dados para o período selecionado.</p>';
  } else {
    sortedDates.forEach(dk => {
      const entries = byDate[dk].sort((a, b) => a.sort - b.sort);
      const dayLabel = new Date(dk + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
      const rows = entries.map(e => {
        const c = TC[e.type] || TC.thought;
        return `<div class="entry">
          <span class="badge" style="background:${c.bg};border-color:${c.border};color:${c.text}">${e.badge}</span>
          <span class="time">${e.time}</span>
          <span class="detail">${e.detail}</span>
        </div>`;
      }).join('');
      timelineHTML += `<div class="day"><div class="day-header">${dayLabel}</div><div class="entries">${rows}</div></div>`;
    });
  }

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>N.E.P. · Relatório</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;padding:14mm 18mm}
  /* Header */
  .hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #7c3aed;padding-bottom:10px;margin-bottom:18px}
  .hdr-l h1{font-size:17pt;font-weight:900;color:#7c3aed;letter-spacing:-0.5px}
  .hdr-l p{font-size:9pt;color:#6b7280;margin-top:2px}
  .hdr-r{text-align:right;font-size:8.5pt;color:#9ca3af;line-height:1.5}
  /* Summary */
  .summary{background:#f9f6ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px 14px;margin-bottom:18px}
  .section-label{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#7c3aed;margin-bottom:10px}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-bottom:10px}
  .stat{text-align:center}
  .stat-icon{font-size:13pt;line-height:1;margin-bottom:2px}
  .stat-value{font-size:12pt;font-weight:800;color:#111827;line-height:1.1}
  .stat-label{font-size:7pt;color:#6b7280;margin-top:1px}
  .stat-trend{font-size:7pt;font-weight:600;margin-top:1px}
  .emotions-row{border-top:1px solid #e0d5ff;padding-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .emotions-label{font-size:8pt;color:#6b7280}
  .emotion-tag{font-size:8pt;background:#ede9fe;color:#5b21b6;border-radius:20px;padding:2px 8px}
  /* Timeline */
  .tl-label{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#7c3aed;margin-bottom:12px}
  .day{margin-bottom:16px;page-break-inside:avoid}
  .day-header{font-size:9.5pt;font-weight:700;color:#374151;padding-bottom:5px;border-bottom:1px solid #e5e7eb;margin-bottom:7px;text-transform:capitalize}
  .entries{display:flex;flex-direction:column;gap:4px}
  .entry{display:flex;align-items:baseline;gap:7px;font-size:9pt}
  .badge{display:inline-block;font-size:7.5pt;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid;white-space:nowrap;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .time{color:#9ca3af;font-size:8pt;flex-shrink:0;min-width:34px}
  .detail{color:#374151;flex:1;line-height:1.45}
  /* Print */
  @media print{body{padding:8mm 14mm}.no-print{display:none!important}.summary{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  .print-btn{display:block;margin:24px auto 0;padding:9px 30px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:10.5pt;font-weight:600;cursor:pointer}
  .print-btn:hover{background:#6d28d9}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-l">
    <h1>N.E.P.</h1>
    <p>Relatório de saúde · ${rangeLabel}</p>
  </div>
  <div class="hdr-r">
    Gerado em ${now}<br>
    <span style="font-size:7.5pt">Gerado localmente · partilha com o teu profissional de saúde</span>
  </div>
</div>

${statsHTML}

${sortedDates.length > 0 ? `<div class="tl-label">Registos por dia</div>` : ''}
${timelineHTML}

<div class="no-print">
  <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
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
