import React, { useState, useMemo } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { useData } from '../contexts/DataContext';

// ===== ECRÃ "INVESTIGAÇÃO" (só para a conta da investigadora) =====
// Lê as fichas semanais do modo investigação (research/{anonId}/weeks/{semana}),
// que já chegam AGREGADAS por semana e sem texto (ver researchService.js).
//
// Quem pode ler: SÓ a conta RESEARCH_ADMIN_UID — a regra está no servidor
// (firestore.rules, "match /{path=**}/weeks/{weekKey}"). Este ecrã é só a
// montra; a porta é a regra. Se alguém mudar este número no código, o
// servidor continua a recusar.
//
// Proteções no ecrã:
// - Médias de grupo só com pelo menos MIN_PEOPLE pessoas nessa semana. Abaixo
//   disso, a "média" seria o retrato de uma ou duas pessoas.
// - O CSV tem as fichas tal como estão (pseudónimas: um código por pessoa,
//   sem email). Fica só no aparelho de quem descarrega.
export const RESEARCH_ADMIN_UID = '2OxkWULzLIeH91Ohg7wuD2Bd82J2';
const MIN_PEOPLE = 5;

const mean = (arr) => {
    const v = arr.filter(x => typeof x === 'number' && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const fmt = (v, d = 1) => v == null ? '—' : v.toFixed(d).replace('.', ',');
const hourFmt = (h) => {
    if (h == null) return '—';
    const hh = ((Math.floor(h) % 24) + 24) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
};

export function ResearchViewer() {
    const { db, user } = useData();
    const [rows, setRows] = useState(null);
    const [state, setState] = useState('idle'); // idle | loading | done | denied | error
    const [errMsg, setErrMsg] = useState('');

    const isAdmin = !!user && user.uid === RESEARCH_ADMIN_UID;

    const load = async () => {
        if (!db) return;
        setState('loading');
        try {
            const snap = await getDocs(collectionGroup(db, 'weeks'));
            const list = [];
            snap.forEach(d => {
                // Só as fichas de investigação (research/{anonId}/weeks/...).
                if (d.ref.parent?.parent?.parent?.id !== 'research') return;
                list.push(d.data());
            });
            setRows(list);
            setState('done');
        } catch (e) {
            if (e?.code === 'permission-denied') setState('denied');
            else { setState('error'); setErrMsg(e?.message || String(e)); }
        }
    };

    const byWeek = useMemo(() => {
        if (!rows) return [];
        const g = {};
        rows.forEach(r => { if (r?.week) (g[r.week] = g[r.week] || []).push(r); });
        return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0])).map(([week, list]) => {
            const people = new Set(list.map(r => r.anonId)).size;
            const enough = people >= MIN_PEOPLE;
            const emo = {};
            if (enough) list.forEach(r => Object.entries(r.wellbeing?.emotionCounts || {}).forEach(([k, n]) => { emo[k] = (emo[k] || 0) + n; }));
            return {
                week, people, enough,
                count: enough ? mean(list.map(r => r.consumption?.count)) : null,
                daysUsed: enough ? mean(list.map(r => r.consumption?.daysUsed)) : null,
                totalMg: enough ? mean(list.map(r => r.consumption?.totalMg)) : null,
                sleep: enough ? mean(list.map(r => r.sleep?.avgHours)) : null,
                // Hora de deitar: 01:00 conta como 25:00, para 23:00 e 01:00 darem
                // meia-noite e não meio-dia. (A média de cada pessoa por semana já
                // vem feita do telemóvel sem este cuidado — ver nota no relatório.)
                bedtime: enough ? mean(list.map(r => { const h = r.sleep?.avgBedtimeHour; return typeof h === 'number' ? (h < 12 ? h + 24 : h) : null; })) : null,
                mood: enough ? mean(list.map(r => r.wellbeing?.avgMood)) : null,
                energy: enough ? mean(list.map(r => r.wellbeing?.avgEnergy)) : null,
                topEmo: Object.entries(emo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k),
            };
        });
    }, [rows]);

    const people = useMemo(() => rows ? new Set(rows.map(r => r.anonId)).size : 0, [rows]);

    const downloadCsv = () => {
        if (!rows?.length) return;
        const cols = ['anonId', 'week', 'consumption.count', 'consumption.daysUsed', 'consumption.totalMg', 'consumption.avgMgPerUse',
            'sleep.count', 'sleep.avgHours', 'sleep.avgBedtimeHour', 'wellbeing.count', 'wellbeing.avgMood', 'wellbeing.avgEnergy',
            'wellbeing.emotionCounts', 'goals.types'];
        const get = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
        const cell = (v) => {
            if (v == null) return '';
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = [cols.join(','), ...rows.map(r => cols.map(c => cell(get(r, c))).join(','))].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'investigacao-semanas.csv'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    if (!user) return null;

    return (
        <div className="space-y-3 text-sm text-gray-300">
            <p className="text-xs text-gray-400">
                Fichas semanais do modo investigação: agregadas no telemóvel de cada pessoa, sem texto, com um código por pessoa (pseudónimo, não anónimo).
            </p>
            <p className="text-[11px] text-gray-500 font-mono-theme break-all">esta conta: {user.uid}</p>
            {!isAdmin ? (
                <p className="text-xs text-gray-400">Esta conta não tem acesso a estes dados.</p>
            ) : (
                <>
                    {state !== 'done' && (
                        <button type="button" onClick={load} disabled={state === 'loading'}
                            className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-60">
                            {state === 'loading' ? 'A carregar…' : 'Ver dados de investigação'}
                        </button>
                    )}
                    {state === 'denied' && (
                        <p className="text-xs text-gray-400">O servidor recusou. Falta publicar a regra nova no Firebase (Firestore → Regras → Publicar).</p>
                    )}
                    {state === 'error' && <p className="text-xs text-gray-400">Não deu para carregar: {errMsg}</p>}
                    {state === 'done' && (
                        <div className="space-y-3">
                            <p>
                                <span className="font-mono-theme text-white">{people}</span> {people === 1 ? 'pessoa' : 'pessoas'} · <span className="font-mono-theme text-white">{rows.length}</span> fichas semanais
                            </p>
                            <button type="button" onClick={downloadCsv} disabled={!rows.length}
                                className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-200 text-xs">
                                ⬇ Descarregar CSV (fica só neste aparelho)
                            </button>
                            {byWeek.length === 0 ? (
                                <p className="text-xs text-gray-400">Ainda não há fichas.</p>
                            ) : (
                                <div className="divide-y divide-gray-700 border-y border-gray-700">
                                    {byWeek.map(w => (
                                        <div key={w.week} className="py-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-mono-theme text-white">{w.week}</span>
                                                <span className="text-gray-400">{w.people} {w.people === 1 ? 'pessoa' : 'pessoas'}</span>
                                            </div>
                                            {!w.enough ? (
                                                <p className="text-[11px] text-gray-500 mt-1">Menos de {MIN_PEOPLE} pessoas: não se mostram médias (seria o retrato de alguém).</p>
                                            ) : (
                                                <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                                    média por pessoa: <span className="font-mono-theme text-gray-200">{fmt(w.count)}</span> consumos em <span className="font-mono-theme text-gray-200">{fmt(w.daysUsed)}</span> dias · <span className="font-mono-theme text-gray-200">{fmt(w.totalMg, 0)}</span> mg
                                                    {' · '}sono <span className="font-mono-theme text-gray-200">{fmt(w.sleep)}</span> h, deitar <span className="font-mono-theme text-gray-200">{hourFmt(w.bedtime)}</span>
                                                    {' · '}humor <span className="font-mono-theme text-gray-200">{fmt(w.mood)}</span>, energia <span className="font-mono-theme text-gray-200">{fmt(w.energy)}</span>
                                                    {w.topEmo.length > 0 && <> · emoções mais escolhidas: {w.topEmo.join(', ')}</>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
