import React, { useState, useMemo } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { useData } from '../contexts/DataContext';
import { getWeekKey } from '../services/researchService';

// ===== ECRÃ "INVESTIGAÇÃO" (só para a conta da investigadora) =====
// Lê as fichas semanais do modo investigação (research/{anonId}/weeks/{semana}),
// que já chegam AGREGADAS por semana e sem texto (ver researchService.js).
//
// Quem pode ler: SÓ a conta RESEARCH_ADMIN_UID — a regra está no servidor
// (firestore.rules, "match /{path=**}/weeks/{weekKey}"). Este ecrã é só a
// montra; a porta é a regra. Se alguém mudar este número no código, o
// servidor continua a recusar.
//
// O ecrã mostra só participação e qualidade dos dados (sem médias de grupo:
// misturam pessoas e, com poucas, seriam o retrato de alguém). O CSV tem as
// fichas tal como estão (pseudónimas: um código por pessoa, sem email) e fica
// só no aparelho de quem descarrega.
export const RESEARCH_ADMIN_UID = '2OxkWULzLIeH91Ohg7wuD2Bd82J2';

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

    // O que este ecrã mostra (decidido com a Teresa, 14-11-2026): NÃO médias de
    // grupo por semana — misturam pessoas e não respondem a nenhuma pergunta.
    // Mostra o que qualquer relatório pede primeiro e o que diz se os dados
    // aguentam alguma análise: PARTICIPAÇÃO e QUALIDADE DOS DADOS. A análise a
    // sério faz-se fora (R, etc.) com o CSV. Perguntas possíveis em
    // PLANO-INVESTIGACAO.md.
    const summary = useMemo(() => {
        if (!rows) return null;
        const byPerson = {};
        rows.forEach(r => { if (r?.anonId && r?.week) (byPerson[r.anonId] = byPerson[r.anonId] || new Set()).add(r.week); });
        const weeksPer = Object.values(byPerson).map(s => s.size).sort((a, b) => a - b);
        const median = weeksPer.length ? (weeksPer.length % 2 ? weeksPer[(weeksPer.length - 1) / 2] : (weeksPer[weeksPer.length / 2 - 1] + weeksPer[weeksPer.length / 2]) / 2) : null;
        // Ativas = com ficha numa das últimas 4 semanas (inclui a atual).
        const recent = new Set([0, 7, 14, 21].map(d => getWeekKey(Date.now() - d * 86400000)));
        const active = Object.values(byPerson).filter(s => [...s].some(w => recent.has(w))).length;
        const allWeeks = rows.map(r => r.week).filter(Boolean).sort();
        const n = rows.length;
        const pct = (pred) => n ? Math.round(100 * rows.filter(pred).length / n) : 0;
        const quality = [
            ['consumos', pct(r => r.consumption?.count > 0)],
            ['mg medidos', pct(r => r.consumption?.totalMg > 0)],
            ['sono (horas)', pct(r => typeof r.sleep?.avgHours === 'number')],
            ['hora de deitar', pct(r => typeof r.sleep?.avgBedtimeHour === 'number')],
            ['humor', pct(r => typeof r.wellbeing?.avgMood === 'number')],
            ['energia', pct(r => typeof r.wellbeing?.avgEnergy === 'number')],
            ['emoções', pct(r => r.wellbeing?.emotionCounts && Object.keys(r.wellbeing.emotionCounts).length > 0)],
            ['metas', pct(r => r.goals?.count > 0)],
        ];
        return {
            people: weeksPer.length, active, median,
            min: weeksPer[0] ?? null, max: weeksPer[weeksPer.length - 1] ?? null,
            first: allWeeks[0] || null, last: allWeeks[allWeeks.length - 1] || null, quality,
        };
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
                            {!summary || summary.people === 0 ? (
                                <p className="text-xs text-gray-400">Ainda não há fichas.</p>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Participação</p>
                                        <div className="text-xs text-gray-300 leading-relaxed">
                                            <span className="font-mono-theme text-white">{summary.active}</span> de <span className="font-mono-theme text-white">{summary.people}</span> com fichas nas últimas 4 semanas
                                            {' · '}semanas por pessoa: mediana <span className="font-mono-theme text-white">{summary.median}</span> (de <span className="font-mono-theme">{summary.min}</span> a <span className="font-mono-theme">{summary.max}</span>)
                                            {' · '}de <span className="font-mono-theme">{summary.first}</span> a <span className="font-mono-theme">{summary.last}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Qualidade dos dados</p>
                                        <p className="text-[11px] text-gray-500 mb-1">Em quantas das {rows.length} fichas semanais existe cada coisa.</p>
                                        <div className="divide-y divide-gray-700 border-y border-gray-700">
                                            {summary.quality.map(([label, p]) => (
                                                <div key={label} className="flex items-center gap-2 py-1.5 text-xs">
                                                    <span className="w-28 text-gray-300">{label}</span>
                                                    <div className="flex-1 h-1.5 rounded bg-gray-700 overflow-hidden"><div className="h-full bg-gray-400" style={{ width: p + '%' }} /></div>
                                                    <span className="w-10 text-right font-mono-theme text-gray-200">{p}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Sem médias de grupo: misturam pessoas e não respondem a perguntas. As análises fazem-se com o CSV (ver PLANO-INVESTIGACAO.md).</p>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
