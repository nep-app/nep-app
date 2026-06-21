import { doc, setDoc } from 'firebase/firestore';
import { analyzeNote } from '../utils/sentimentAnalysis';

export const DATA_MODE_KEY = 'nep_data_mode';
const RESEARCH_ID_KEY = 'nep_research_id';

export const getDataMode = () => localStorage.getItem(DATA_MODE_KEY);
export const setDataMode = (mode) => localStorage.setItem(DATA_MODE_KEY, mode);

export const getOrCreateResearchId = () => {
    let id = localStorage.getItem(RESEARCH_ID_KEY);
    if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() :
            Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
        localStorage.setItem(RESEARCH_ID_KEY, id);
    }
    return id;
};

// ISO week key e.g. "2026-W25"
const getWeekKey = (ts) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const week = 1 + Math.round(((d - jan4) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const getPeriod = (ts) => {
    const h = new Date(ts).getHours();
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 23) return 'evening';
    return 'night';
};

const avg = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

const classifySentiment = (text) => {
    if (!text) return 'neutral';
    const result = analyzeNote(text);
    if (!result) return 'neutral';
    if (result.classification === 'very_positive' || result.classification === 'positive') return 'positive';
    if (result.classification === 'very_negative' || result.classification === 'negative') return 'negative';
    return 'neutral';
};

const aggregateWeek = (weekKey, consumptions, cycles, wellbeingLogs, reflections, thoughts, goals) => {
    const inWeek = (ts) => ts && getWeekKey(ts) === weekKey;

    const wCons = consumptions.filter(c => inWeek(c.timestamp));
    const wCycles = cycles.filter(c => inWeek(c.timestamp || c.date));
    const wWb = wellbeingLogs.filter(w => inWeek(w.timestamp));
    const wRef = reflections.filter(r => inWeek(r.timestamp));
    const wTh = thoughts.filter(t => inWeek(t.timestamp));

    // Consumptions
    const byPeriod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    wCons.forEach(c => { byPeriod[getPeriod(c.timestamp)]++; });
    const amounts = wCons.map(c => parseFloat(c.amount)).filter(n => !isNaN(n));

    // Sleep
    const sleepHours = wCycles.map(c => parseFloat(c.sleep)).filter(n => !isNaN(n));
    const bedtimeHours = wCycles.map(c => {
        if (!c.bedtime) return null;
        const [h, m] = c.bedtime.split(':').map(Number);
        return h + m / 60;
    }).filter(h => h !== null);
    const triggerCounts = {};
    wCycles.forEach(c => (c.triggers || []).forEach(t => {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    }));

    // Wellbeing
    const moods = wWb.map(w => Number(w.mood)).filter(n => n > 0);
    const energies = wWb.map(w => Number(w.energy)).filter(n => n > 0);
    const emotionCounts = {};
    wWb.forEach(w => (w.emotions || []).forEach(e => {
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    }));

    // Sentiment (computed, text not stored)
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    [...wRef.map(r => r.answer), ...wTh.map(t => t.text)]
        .filter(Boolean)
        .forEach(text => { sentimentCounts[classifySentiment(text)]++; });

    const hasConsumption = wCons.length > 0;
    const hasSleep = wCycles.length > 0;
    const hasWellbeing = wWb.length > 0;
    const hasSentiment = (sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral) > 0;

    return {
        week: weekKey,
        updatedAt: new Date().toISOString(),
        consumption: hasConsumption ? {
            count: wCons.length,
            daysUsed: new Set(wCons.map(c => c.date)).size,
            totalMg: Math.round(amounts.reduce((a, b) => a + b, 0)),
            avgMgPerUse: avg(amounts),
            byPeriod,
        } : null,
        sleep: hasSleep ? {
            count: wCycles.length,
            avgHours: avg(sleepHours),
            avgBedtimeHour: avg(bedtimeHours),
            triggerCounts: Object.keys(triggerCounts).length > 0 ? triggerCounts : null,
        } : null,
        wellbeing: hasWellbeing ? {
            count: wWb.length,
            avgMood: avg(moods),
            avgEnergy: avg(energies),
            emotionCounts: Object.keys(emotionCounts).length > 0 ? emotionCounts : null,
        } : null,
        sentiment: hasSentiment ? sentimentCounts : null,
        goals: goals.filter(g => g.active !== false).length > 0 ? {
            types: goals.filter(g => g.active !== false).map(g => g.type),
            count: goals.filter(g => g.active !== false).length,
        } : null,
    };
};

export const syncResearchData = async (firebaseDB, { consumptions, cycles, wellbeingLogs, reflections, thoughts, goals }) => {
    try {
        const anonId = getOrCreateResearchId();

        // Collect all unique weeks from data (last 52 weeks max)
        const allTs = [
            ...consumptions.map(c => c.timestamp),
            ...cycles.map(c => c.timestamp || c.date),
            ...wellbeingLogs.map(w => w.timestamp),
            ...reflections.map(r => r.timestamp),
            ...thoughts.map(t => t.timestamp),
        ].filter(Boolean);

        const weekKeys = [...new Set(allTs.map(getWeekKey))].sort().slice(-52);

        for (const weekKey of weekKeys) {
            const weekData = aggregateWeek(weekKey, consumptions, cycles, wellbeingLogs, reflections, thoughts, goals);
            if (!weekData.consumption && !weekData.sleep && !weekData.wellbeing) continue;
            await setDoc(doc(firebaseDB, 'research', anonId, 'weeks', weekKey), weekData, { merge: true });
        }

        localStorage.setItem('nep_research_last_sync', new Date().toISOString());
        console.log('[Research] ✅ Sincronizados', weekKeys.length, 'semanas de dados anónimos');
    } catch (err) {
        console.warn('[Research] ⚠️ Falha na sincronização de investigação (não crítico):', err.message);
    }
};
