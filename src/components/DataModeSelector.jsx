import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setDataMode } from '../services/researchService';

const OPTIONS = [
    {
        id: 'local',
        icon: '📱',
        title: { pt: 'Só no meu telemóvel', en: 'My device only' },
        desc: {
            pt: 'Os dados ficam apenas no teu dispositivo. Sem cópia de segurança — se perderes o telemóvel ou desinstalares a app, perdes tudo.',
            en: 'Data stays only on your device. No backup — if you lose your phone or uninstall the app, all data is lost.',
        },
        desc2: {
            pt: 'Confirmo que aceito o risco de perda de dados sem backup.',
            en: 'I accept the risk of losing all data with no backup.',
        },
        border: 'border-yellow-600',
        badge: { pt: '⚠️ Sem backup', en: '⚠️ No backup' },
        badgeColor: 'bg-yellow-900/40 text-yellow-300',
    },
    {
        id: 'cloud',
        icon: '🔒',
        title: { pt: 'Cloud encriptada', en: 'Encrypted cloud' },
        desc: {
            pt: 'Cópia de segurança automática na cloud, completamente encriptada com o teu PIN. Nem nós temos acesso — zero-knowledge.',
            en: 'Automatic cloud backup, fully encrypted with your PIN. We have zero access — zero-knowledge.',
        },
        desc2: null,
        border: 'border-green-600',
        badge: { pt: '✅ Recomendado', en: '✅ Recommended' },
        badgeColor: 'bg-green-900/40 text-green-300',
    },
    {
        id: 'research',
        icon: '🔬',
        title: { pt: 'Cloud + partilha para investigação', en: 'Cloud + research sharing' },
        desc: {
            pt: 'Igual à opção anterior, mas partilhas números e padrões anonimizados para investigação de redução de danos. Nunca partilhamos textos — apenas contagens, médias e pontuações de sentimento.',
            en: 'Same as above, but you share anonymised numbers and patterns for harm reduction research. We never share any text — only counts, averages, and sentiment scores.',
        },
        desc2: null,
        border: 'border-purple-600',
        badge: { pt: '🔬 Ajudas a investigar', en: '🔬 Help research' },
        badgeColor: 'bg-purple-900/40 text-purple-300',
    },
];

export function DataModeSelector({ onSelected }) {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'en' ? 'en' : 'pt';
    const [selected, setSelected] = useState(null);

    const handleConfirm = () => {
        if (!selected) return;
        setDataMode(selected);
        onSelected(selected);
    };

    const selectedOption = OPTIONS.find(o => o.id === selected);

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-y-auto">
            <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="text-5xl mb-3">🛡️</div>
                    <h1 className="text-2xl font-bold text-white">
                        {lang === 'pt' ? 'Os teus dados, a tua escolha' : 'Your data, your choice'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {lang === 'pt'
                            ? 'Escolhe como queres guardar os teus dados. Podes mudar esta opção mais tarde nas definições.'
                            : 'Choose how you want to store your data. You can change this later in settings.'}
                    </p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                    {OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setSelected(opt.id)}
                            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                                selected === opt.id
                                    ? opt.border + ' bg-gray-800'
                                    : 'border-gray-700 bg-gray-800/60 hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl mt-0.5">{opt.icon}</span>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-white">{opt.title[lang]}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.badgeColor}`}>
                                            {opt.badge[lang]}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400">{opt.desc[lang]}</p>
                                    {selected === opt.id && opt.desc2 && (
                                        <p className="text-xs text-yellow-300 mt-1 italic">{opt.desc2[lang]}</p>
                                    )}
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                                    selected === opt.id
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-gray-600'
                                }`} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Research details box */}
                {selected === 'research' && (
                    <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-4 text-sm text-gray-300 space-y-2">
                        <p className="font-semibold text-purple-300">
                            {lang === 'pt' ? 'O que é partilhado (anónimo):' : 'What is shared (anonymous):'}
                        </p>
                        <ul className="space-y-1 text-xs text-gray-400">
                            <li>✅ {lang === 'pt' ? 'Nº de consumos, mg médio, padrões por hora do dia' : 'Number of uses, average mg, patterns by time of day'}</li>
                            <li>✅ {lang === 'pt' ? 'Horas de sono, hora de deitar, gatilhos (da lista fixa)' : 'Sleep hours, bedtime, triggers (from fixed list)'}</li>
                            <li>✅ {lang === 'pt' ? 'Humor e energia médios, emoções registadas' : 'Average mood and energy, logged emotions'}</li>
                            <li className="text-red-400">❌ {lang === 'pt' ? 'Nunca: notas, reflexões, pensamentos escritos, nome, email' : 'Never: notes, reflections, written thoughts, name, email'}</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic">
                            {lang === 'pt'
                                ? 'O teu ID de investigação é aleatório e não tem ligação à tua conta.'
                                : 'Your research ID is random and has no link to your account.'}
                        </p>
                    </div>
                )}

                {/* Local warning */}
                {selected === 'local' && (
                    <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-sm text-yellow-300">
                        {lang === 'pt'
                            ? '⚠️ Sem cópia de segurança. Se perderes o telemóvel ou limpares os dados do browser, perdes todo o histórico. Não há forma de recuperar.'
                            : '⚠️ No backup. If you lose your phone or clear browser data, all history is lost with no way to recover.'}
                    </div>
                )}

                {/* Confirm button */}
                <button
                    onClick={handleConfirm}
                    disabled={!selected}
                    className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                        selected
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-gray-700 opacity-40 cursor-not-allowed'
                    }`}
                >
                    {lang === 'pt' ? 'Confirmar escolha' : 'Confirm choice'}
                </button>

                <p className="text-center text-xs text-gray-600">
                    {lang === 'pt' ? 'Podes mudar esta opção em Definições a qualquer momento.' : 'You can change this in Settings at any time.'}
                </p>
            </div>
        </div>
    );
}
