import React, { useState, useMemo } from 'react';
import * as Icons from '../Icons';
import { useData } from '../../contexts/DataContext';
import { safeDate, safeToISODate, getTodayKey } from '../../utils/helpers';
import { EMOTION_CATEGORIES } from '../../constants/emotions';

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
  let s = String(val);
  // Neutralizar injeção de fórmulas (CSV injection): uma célula que comece por = + - @
  // (ou tab/CR) seria executada como fórmula no Excel/Sheets. Prefixar com aspa simples.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  s = s.replace(/"/g, '""');
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
    const rows = [csvRow(['Data', 'Humor (1-10)', 'Energia (1-10)', 'Água (ml)', 'Exercício (tipo)', 'Duração (min)', 'Sesta (min)', 'Sintomas', 'Alimentação', 'Social', 'Emoções', 'Notas'])];
    data.wellbeingLogs.forEach(w => {
      const symptoms = [
        ...(w.symptoms || []),
        ...(w.customSymptom ? [w.customSymptom] : [])
      ].join('; ');
      const waterMl = w.waterGlasses != null
        ? (w.waterGlasses >= 50 ? w.waterGlasses : w.waterGlasses * 250)
        : (w.water ? 250 : 0);
      rows.push(csvRow([
        fmtDateTime(w.timestamp || w.date),
        w.mood   || '',
        w.energy || '',
        waterMl || '',
        w.exerciseType || w.exercise || (w.rest ? 'Sim' : ''),
        w.exerciseDuration || '',
        w.napDuration || '',
        symptoms,
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

// Escapa texto controlado pelo utilizador antes de o inserir no HTML do relatório.
// Sem isto, uma nota como `<img src=x onerror=...>` correria código na janela de impressão.
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildPrintHTML = (data, selected, period, customFrom, customTo) => {
  const periodLabel = PERIODS.find(p => p.id === period)?.label || period;
  const now = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });

  const rangeLabel = period === 'custom'
    ? `${customFrom ? new Date(customFrom + 'T12:00:00').toLocaleDateString('pt-PT') : '…'} — ${customTo ? new Date(customTo + 'T12:00:00').toLocaleDateString('pt-PT') : '…'}`
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
  const topNegEmotions = Object.entries(emotionCounts)
    .filter(([e]) => EMOTION_CATEGORIES.negative.includes(e) && e !== '🔥 Com craving')
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
  const topPosEmotions = Object.entries(emotionCounts)
    .filter(([e]) => EMOTION_CATEGORIES.positive.includes(e))
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);

  const scTotal = selected.wellbeing ? data.wellbeingLogs.length : 0;
  const scDays  = selected.wellbeing ? data.wellbeingLogs.filter(w => (w.water || w.waterGlasses > 0) || (w.rest || w.exercise) || w.food || w.social).length : 0;
  const scPct   = scTotal > 0 ? Math.round((scDays / scTotal) * 100) : null;

  // ── Self-care breakdown ───────────────────────────────────────────────────
  const scItems = ['water', 'rest', 'food', 'social'];
  const scLabels = { water: 'água', rest: 'exercício', food: 'alimentação', social: 'apoio social' };
  const scItemPct = {};
  if (scTotal > 0) {
    scItems.forEach(k => {
      let n;
      if (k === 'water') n = data.wellbeingLogs.filter(w => w.water || (w.waterGlasses > 0)).length;
      else if (k === 'rest') n = data.wellbeingLogs.filter(w => w.rest || (w.exercise && w.exercise.trim())).length;
      else n = data.wellbeingLogs.filter(w => w[k]).length;
      scItemPct[k] = Math.round((n / scTotal) * 100);
    });
  }
  const mostMissedSC = scTotal > 0
    ? scItems.reduce((a, b) => scItemPct[a] < scItemPct[b] ? a : b)
    : null;

  // ── Craving & low mood days ───────────────────────────────────────────────
  const cravingDates = selected.wellbeing ? [...new Set(
    data.wellbeingLogs
      .filter(w => (w.emotions || []).includes('🔥 Com craving'))
      .map(w => safeDate(w.timestamp || w.date))
      .filter(Boolean)
      .map(d => d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }))
  )] : [];

  const lowMoodDates = selected.wellbeing ? [...new Set(
    data.wellbeingLogs
      .filter(w => parseFloat(w.mood) <= 4 && !isNaN(parseFloat(w.mood)))
      .map(w => safeDate(w.timestamp || w.date))
      .filter(Boolean)
      .map(d => d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }))
  )] : [];

  // ── Sleep quality ─────────────────────────────────────────────────────────
  const shortNights = sleepVals.filter(v => v < 6).length;
  const longNights  = sleepVals.filter(v => v >= 8).length;

  // ── Trend analysis (first half vs second half of period) ──────────────────
  const trendFor = (vals) => {
    if (vals.length < 4) return null;
    const h = Math.floor(vals.length / 2);
    const first = avg(vals.slice(0, h)), last = avg(vals.slice(-h));
    if (first == null || last == null) return null;
    const diff = last - first;
    return { direction: Math.abs(diff) < 0.3 ? 'stable' : diff > 0 ? 'up' : 'down', first: first.toFixed(1), last: last.toFixed(1) };
  };
  const moodTrend   = trendFor(moodVals);
  const energyTrend = trendFor(energyVals);
  const sleepTrend  = trendFor(sleepVals);

  const trendHTML = (t, unit = '', upGood = true) => {
    if (!t) return '';
    if (t.direction === 'stable') return `<span style="color:#6b7280"> (estável)</span>`;
    const color = (t.direction === 'up') === upGood ? '#16a34a' : '#dc2626';
    const arrow = t.direction === 'up' ? '↑' : '↓';
    return `<span style="color:${color}"> ${arrow} ${t.first}→${t.last}${unit}</span>`;
  };

  // ── Build stats rows ───────────────────────────────────────────────────────
  const statsRows = [
    selected.consumptions && data.consumptions.length > 0
      ? `<tr><td>💊 Consumos</td><td><b>${data.consumptions.length}</b></td></tr>` : '',
    avgMg != null
      ? `<tr><td>📋 Dose média/dia</td><td><b>${avgMg}mg</b></td></tr>` : '',
    avgMood != null
      ? `<tr><td>😊 Humor médio</td><td><b>${avgMood}/10</b>${trendHTML(moodTrend)}</td></tr>` : '',
    avgEnergy != null
      ? `<tr><td>⚡ Energia média</td><td><b>${avgEnergy}/10</b>${trendHTML(energyTrend)}</td></tr>` : '',
    avgSleep != null
      ? `<tr><td>🌙 Sono médio</td><td><b>${avgSleep}h</b>${trendHTML(sleepTrend, 'h')}${shortNights > 0 ? `<span style="color:#9ca3af;font-size:7.5pt"> · ${shortNights}× abaixo de 6h</span>` : ''}</td></tr>` : '',
    scPct != null
      ? `<tr><td>💚 Autocuidado</td><td><b>${scPct}%</b>${mostMissedSC ? `<span style="font-size:7.5pt;color:#9ca3af"> · mais em falta: ${scLabels[mostMissedSC]} (${scItemPct[mostMissedSC]}%)</span>` : ''}</td></tr>` : '',
    cravingDates.length > 0
      ? `<tr><td>🔥 Dias com craving</td><td><b>${cravingDates.length}</b><span style="font-size:7.5pt;color:#9ca3af"> · ${cravingDates.slice(0,5).join(', ')}${cravingDates.length > 5 ? '…' : ''}</span></td></tr>` : '',
    lowMoodDates.length > 0
      ? `<tr><td>😔 Dias com humor ≤4</td><td><b>${lowMoodDates.length}</b><span style="font-size:7.5pt;color:#9ca3af"> · ${lowMoodDates.slice(0,5).join(', ')}${lowMoodDates.length > 5 ? '…' : ''}</span></td></tr>` : '',
  ].filter(Boolean);

  // ── Patterns section ──────────────────────────────────────────────────────
  const patternRows = [
    topPosEmotions.length > 0
      ? `<tr><td>🌱 Emoções positivas</td><td>${topPosEmotions.join(' · ')}</td></tr>` : '',
    topNegEmotions.length > 0
      ? `<tr><td>⚠️ Emoções negativas</td><td>${topNegEmotions.join(' · ')}</td></tr>` : '',
    scTotal > 0
      ? `<tr><td>💧 Hidratação</td><td>${scItemPct.water}%</td></tr>` : '',
    scTotal > 0
      ? `<tr><td>🏃 Exercício</td><td>${scItemPct.rest}%</td></tr>` : '',
    scTotal > 0
      ? `<tr><td>🍽️ Alimentação</td><td>${scItemPct.food}%</td></tr>` : '',
    scTotal > 0
      ? `<tr><td>👥 Apoio social</td><td>${scItemPct.social}%</td></tr>` : '',
  ].filter(Boolean);

  const patternsHTML = patternRows.length > 0 ? `
  <section class="summary" style="margin-top:10px">
    <div class="section-label">Padrões emocionais e autocuidado</div>
    <table class="stats-table">
      <tbody>${patternRows.join('')}</tbody>
    </table>
    <p class="trend-note">Percentagem dos registos em que cada item foi assinalado</p>
  </section>` : '';

  const statsHTML = statsRows.length > 0 ? `
  <section class="summary">
    <div class="section-label">Resumo · ${rangeLabel}</div>
    <table class="stats-table">
      <tbody>${statsRows.join('')}</tbody>
    </table>
    <p class="trend-note">Tendências: primeira metade vs. segunda metade do período</p>
  </section>${patternsHTML}` : '';

  // ── Build timeline ─────────────────────────────────────────────────────────
  const cyclesWithEnd = computeCycleEnds(data.cycles || []);

  // Group raw data by date
  const rawByDate = {};
  const ensureRaw = (dk) => {
    if (!rawByDate[dk]) rawByDate[dk] = { consumptions: [], dailyLogs: [], cycles: [], wellbeing: [], reflections: [], thoughts: [] };
  };

  if (selected.consumptions) {
    data.consumptions.forEach(c => {
      const d = safeDate(c.timestamp); if (!d) return;
      const dk = safeToISODate(d);
      ensureRaw(dk); rawByDate[dk].consumptions.push({ d, c });
    });
  }
  if (selected.dailyLogs) {
    data.dailyLogs.forEach(l => {
      const d = safeDate(l.date || l.timestamp); if (!d) return;
      const dk = l.date || safeToISODate(d);
      ensureRaw(dk); rawByDate[dk].dailyLogs.push(l);
    });
  }
  if (selected.cycles) {
    cyclesWithEnd.forEach(c => {
      const d = safeDate(c.timestamp); if (!d) return;
      ensureRaw(safeToISODate(d)); rawByDate[safeToISODate(d)].cycles.push({ d, c });
    });
  }
  if (selected.wellbeing) {
    data.wellbeingLogs.forEach(w => {
      const d = safeDate(w.timestamp || w.date); if (!d) return;
      const dk = safeToISODate(d);
      ensureRaw(dk); rawByDate[dk].wellbeing.push({ d, w });
    });
  }
  if (selected.reflections) {
    data.reflections.forEach(r => {
      const d = safeDate(r.timestamp || r.date); if (!d) return;
      const dk = safeToISODate(d);
      ensureRaw(dk); rawByDate[dk].reflections.push({ d, r });
    });
  }
  if (selected.thoughts) {
    data.thoughts.forEach(t => {
      const d = safeDate(t.timestamp || t.date); if (!d) return;
      const dk = safeToISODate(d);
      ensureRaw(dk); rawByDate[dk].thoughts.push({ d, t });
    });
  }

  const TC = {
    consumption: { bg: '#f3e8ff', border: '#7c3aed', text: '#5b21b6' },
    daily:       { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8' },
    cycle:       { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
    wellbeing:   { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
    reflection:  { bg: '#fce7f3', border: '#db2777', text: '#831843' },
    thought:     { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  };
  const badge = (type, label) => { const c = TC[type]; return `<span class="badge" style="background:${c.bg};border-color:${c.border};color:${c.text}">${label}</span>`; };
  const fmt = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const entryLine = (type, badgeLabel, detail) => `<div class="entry">${badge(type, badgeLabel)}<span class="detail">${escapeHtml(detail)}</span></div>`;
  const gapLine = (text) => `<div class="entry"><span class="gap">⚠️ ${escapeHtml(text)}</span></div>`;

  const sortedDates = Object.keys(rawByDate).sort((a, b) => b.localeCompare(a));

  let timelineHTML = '';
  if (sortedDates.length === 0) {
    timelineHTML = '<p style="color:#888;font-style:italic;padding:12px 0;">Sem dados para o período selecionado.</p>';
  } else {
    sortedDates.forEach(dk => {
      const raw = rawByDate[dk];
      const dayLabel = new Date(dk + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
      let rows = '';

      // Consumptions — grouped into one line
      if (selected.consumptions) {
        if (raw.consumptions.length > 0) {
          const sorted = raw.consumptions.sort((a, b) => a.d - b.d);
          const times = sorted.map(({ d, c }) => c.notes ? `${fmt(d)} (${c.notes})` : fmt(d));
          rows += entryLine('consumption', `💊 ${sorted.length}×`, times.join(' · '));
        } else {
          rows += gapLine('Sem consumos registados');
        }
      }

      // Daily log
      if (selected.dailyLogs) {
        if (raw.dailyLogs.length > 0) {
          raw.dailyLogs.forEach(l => {
            const parts = [l.mg ? `${l.mg}mg total` : null, l.notes || null].filter(Boolean);
            rows += entryLine('daily', '📋 Dose', parts.join(' · ') || '—');
          });
        } else {
          rows += gapLine('Sem dose diária registada');
        }
      }

      // Cycles
      if (selected.cycles) {
        if (raw.cycles.length > 0) {
          raw.cycles.forEach(({ c }) => {
            const endD = c._computedEnd ? safeDate(c._computedEnd) : null;
            const parts = [
              c.bedtime ? `Deitou ${c.bedtime}` : null,
              c.sleep   ? `Sono ${c.sleep}h` : null,
              endD      ? `até ${endD.toLocaleDateString('pt-PT')}` : 'em curso',
              (c.triggers || []).length ? c.triggers.join(', ') : null,
              c.notes || null,
            ].filter(Boolean);
            rows += entryLine('cycle', '🌙 Ciclo', parts.join(' · '));
          });
        } else {
          rows += gapLine('Sem ciclo registado');
        }
      }

      // Wellbeing — compact single line per entry
      if (selected.wellbeing) {
        if (raw.wellbeing.length > 0) {
          raw.wellbeing.forEach(({ d, w }) => {
            const timeStr = fmt(d);
            const waterMl = w.waterGlasses >= 50 ? w.waterGlasses : (w.waterGlasses > 0 ? w.waterGlasses * 250 : 0);
            const waterStr = waterMl > 0 ? `💧${waterMl}ml` : (w.water ? '💧' : null);
            const exStr = w.exerciseType ? `🏃${w.exerciseType}${w.exerciseDuration ? ` ${w.exerciseDuration}min` : ''}` : ((w.rest || w.exercise) ? '🏃' : null);
            const napStr = w.napDuration > 0 ? `🛌${w.napDuration}min` : null;
            const sympStr = (() => {
              const all = [...(w.symptoms || []), ...(w.customSymptom ? [w.customSymptom] : [])];
              return all.length ? `🩺${all.join(', ')}` : null;
            })();
            const parts = [
              timeStr,
              w.mood   != null ? `😊${w.mood}/10` : null,
              w.energy != null ? `⚡${w.energy}/10` : null,
              waterStr,
              exStr,
              napStr,
              w.food   ? '🍽️' : null,
              w.social ? '👥' : null,
              sympStr,
              (w.emotions || []).join(' ') || null,
              w.notes || null,
            ].filter(Boolean);
            rows += entryLine('wellbeing', '💚 Bem-estar', parts.join(' · ') || '—');
          });
        } else {
          rows += gapLine('Sem bem-estar registado');
        }
      }

      // Reflections
      if (selected.reflections) {
        if (raw.reflections.length > 0) {
          raw.reflections.forEach(({ r }) => {
            rows += entryLine('reflection', '📝 Reflexão', [r.question, r.answer].filter(Boolean).join(': ') || '—');
          });
        } else {
          rows += gapLine('Sem reflexão registada');
        }
      }

      // Thoughts
      if (selected.thoughts) {
        if (raw.thoughts.length > 0) {
          raw.thoughts.forEach(({ t }) => {
            rows += entryLine('thought', '💭 Pensamento', t.content || '—');
          });
        } else {
          rows += gapLine('Sem pensamento registado');
        }
      }

      timelineHTML += `<div class="day"><div class="day-header">${dayLabel}</div><div class="entries">${rows}</div></div>`;
    });
  }

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>N.E.P. · Relatório</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#1a1a2e;background:#fff;padding:12mm 16mm}
  .hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #7c3aed;padding-bottom:8px;margin-bottom:14px}
  .hdr-l h1{font-size:15pt;font-weight:900;color:#7c3aed;letter-spacing:-0.5px}
  .hdr-l p{font-size:8.5pt;color:#6b7280;margin-top:1px}
  .hdr-r{text-align:right;font-size:8pt;color:#9ca3af;line-height:1.4}
  .summary{background:#f9f6ff;border:1px solid #ddd6fe;border-radius:6px;padding:9px 12px;margin-bottom:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .section-label{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#7c3aed;margin-bottom:7px}
  .stats-table{width:100%;border-collapse:collapse;font-size:8.5pt}
  .stats-table td{padding:2px 6px 2px 0;vertical-align:top;line-height:1.5}
  .stats-table td:first-child{color:#374151;white-space:nowrap;padding-right:12px}
  .stats-table td:last-child{color:#111827}
  .trend-note{font-size:7pt;color:#9ca3af;margin-top:6px}
  .tl-label{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#7c3aed;margin-bottom:10px}
  .day{margin-bottom:12px;page-break-inside:avoid}
  .day-header{font-size:8.5pt;font-weight:700;color:#374151;padding-bottom:3px;border-bottom:1px solid #e5e7eb;margin-bottom:5px;text-transform:capitalize}
  .entries{display:flex;flex-direction:column;gap:3px}
  .entry{display:flex;align-items:baseline;gap:6px;font-size:8.5pt}
  .badge{display:inline-block;font-size:7pt;font-weight:600;padding:1px 6px;border-radius:20px;border:1px solid;white-space:nowrap;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .time{color:#9ca3af;font-size:7.5pt;flex-shrink:0;min-width:32px}
  .detail{color:#374151;flex:1;line-height:1.4}
  .gap{font-size:7.5pt;color:#9ca3af;font-style:italic}
  @page{size:A4 portrait;margin:8mm 10mm}
  @media print{body{padding:0!important}.no-print{display:none!important}.day{page-break-inside:avoid}.summary{page-break-inside:avoid}}
  @media screen and (max-width:600px){body{padding:4vw 5vw;font-size:10pt}.entry{flex-wrap:wrap}.hdr{flex-direction:column;gap:4px}.hdr-r{text-align:left}}
  .print-btn{display:block;margin:20px auto 0;padding:10px 28px;background:#7c3aed;color:#fff;border:none;border-radius:7px;font-size:10pt;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent}
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
    ${now}<br>
    <span style="font-size:7pt">gerado localmente · partilha com o teu profissional de saúde</span>
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
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  };

  const handleDownloadHTML = () => {
    const html = buildPrintHTML(filteredData, selected, period, customFrom, customTo);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nep-relatorio-${getTodayKey()}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
        className="bg-gray-800 border-gray-700 rounded-2xl p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto border"
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
          <button
            onClick={handleDownloadHTML}
            disabled={!anySelected}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &lt;/&gt; Descarregar HTML
          </button>
          <p className="text-xs text-gray-500 text-center">
            PDF: abre uma página para imprimir ou guardar como PDF.<br />
            CSV: faz download de ficheiros para abrir no Excel.<br />
            HTML: ficheiro do relatório para editar ou partilhar.
          </p>
        </div>
      </div>
    </div>
  );
};
