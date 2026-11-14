import { doc, setDoc } from 'firebase/firestore';
import { analyzeNote } from '../utils/sentimentAnalysis';

export const DATA_MODE_KEY = 'nep_data_mode';
const RESEARCH_ID_KEY = 'nep_research_id';

export const getDataMode = () => localStorage.getItem(DATA_MODE_KEY);
export const setDataMode = (mode) => localStorage.setItem(DATA_MODE_KEY, mode);

export const getOrCreateResearchId = () => {
    let id = localStorage.getItem(RESEARCH_ID_KEY);
    if (!id) {
        if (crypto.randomUUID) {
            id = crypto.randomUUID();
        } else {
            // Math.random() NÃO é aleatoriedade criptográfica e dava ~20 chars:
            // adivinhável demais para um identificador que tem de ser impossível
            // de acertar (é o que impede alguém de escrever na série de outra
            // pessoa). crypto.getRandomValues existe em todo o lado onde esta
            // app corre; o Math.random fica como último recurso.
            const bytes = new Uint8Array(16);
            if (crypto.getRandomValues) {
                crypto.getRandomValues(bytes);
            } else {
                for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
            }
            bytes[6] = (bytes[6] & 0x0f) | 0x40; // versão 4
            bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante
            const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
        localStorage.setItem(RESEARCH_ID_KEY, id);
    }
    return id;
};

// ISO week key e.g. "2026-W25"
export const getWeekKey = (ts) => {
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

// Média de HORAS DO RELÓGIO (ex.: hora de deitar). O relógio é um círculo:
// 23:00 e 01:00 estão lado a lado e a média é 00:00 — a média normal dava
// (23+1)/2 = 12:00. Faz-se como com ponteiros: cada hora é uma seta à volta do
// mostrador, somam-se as setas e vê-se para onde aponta a soma.
// Devolve uma hora de 0 a 24 (1 casa decimal), ou null se não houver horas ou
// se as setas se anularem (ex.: só 00:00 e 12:00 — não há "média" que faça sentido).
// Corrigido a 14-11-2026: antes usava avg() e dava meio-dia a quem se deita
// à volta da meia-noite. Como cada sincronização volta a calcular as últimas
// 52 semanas, as fichas desse período ficam corrigidas na sincronização seguinte.
export const circularMeanHour = (hours) => {
    const v = (hours || []).filter(h => typeof h === 'number' && Number.isFinite(h));
    if (!v.length) return null;
    let sx = 0, sy = 0;
    for (const h of v) { const a = (h / 24) * 2 * Math.PI; sx += Math.cos(a); sy += Math.sin(a); }
    if (Math.hypot(sx, sy) / v.length < 1e-6) return null;
    let a = Math.atan2(sy, sx);
    if (a < 0) a += 2 * Math.PI;
    const h = Math.round(((a / (2 * Math.PI)) * 24) * 10) / 10;
    return h >= 24 ? 0 : h;
};

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

    // NOTA: o sentimento das reflexões/pensamentos NÃO é enviado para investigação.
    // O classificador é uma lista de palavras simples (só PT, sem negação/contexto) que
    // classifica mal contexto de redução de danos (ex.: "consumo controlado", "euforia").
    // Dados de investigação com classificação errada são piores do que sem dados.

    const hasConsumption = wCons.length > 0;
    const hasSleep = wCycles.length > 0;
    const hasWellbeing = wWb.length > 0;

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
            avgBedtimeHour: circularMeanHour(bedtimeHours),
            triggerCounts: Object.keys(triggerCounts).length > 0 ? triggerCounts : null,
        } : null,
        wellbeing: hasWellbeing ? {
            count: wWb.length,
            avgMood: avg(moods),
            avgEnergy: avg(energies),
            emotionCounts: Object.keys(emotionCounts).length > 0 ? emotionCounts : null,
        } : null,
        goals: goals.filter(g => g.active !== false).length > 0 ? {
            types: goals.filter(g => g.active !== false).map(g => g.type),
            count: goals.filter(g => g.active !== false).length,
        } : null,
    };
};

export const generateResearchData = ({ consumptions, cycles, wellbeingLogs, reflections, thoughts, goals }) => {
    const allTs = [
        ...consumptions.map(c => c.timestamp),
        ...cycles.map(c => c.timestamp || c.date),
        ...wellbeingLogs.map(w => w.timestamp),
        ...reflections.map(r => r.timestamp),
        ...thoughts.map(t => t.timestamp),
    ].filter(Boolean);

    const weekKeys = [...new Set(allTs.map(getWeekKey))].sort().slice(-52);
    const weeks = {};
    for (const weekKey of weekKeys) {
        const weekData = aggregateWeek(weekKey, consumptions, cycles, wellbeingLogs, reflections, thoughts, goals);
        if (weekData.consumption || weekData.sleep || weekData.wellbeing) {
            weeks[weekKey] = weekData;
        }
    }
    return { anonId: getOrCreateResearchId(), exportedAt: new Date().toISOString(), weeks };
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
            // Incluir anonId no documento para a regra Firestore poder validar que cada
            // utilizador só escreve no SEU próprio anonId (ver firestore.rules).
            await setDoc(doc(firebaseDB, 'research', anonId, 'weeks', weekKey), { ...weekData, anonId }, { merge: true });
        }

        localStorage.setItem('nep_research_last_sync', new Date().toISOString());
        console.log('[Research] ✅ Sincronizados', weekKeys.length, 'semanas de dados anónimos');
    } catch (err) {
        console.warn('[Research] ⚠️ Falha na sincronização de investigação (não crítico):', err.message);
    }
};
