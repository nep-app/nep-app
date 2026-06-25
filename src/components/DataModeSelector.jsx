import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setDataMode } from '../services/researchService';

const OPTIONS = [
    {
        id: 'local',
        icon: '📱',
        border: 'border-yellow-600',
        badgeColor: 'bg-yellow-900/40 text-yellow-300',
    },
    {
        id: 'cloud',
        icon: '🔒',
        border: 'border-green-600',
        badgeColor: 'bg-green-900/40 text-green-300',
    },
    {
        id: 'research',
        icon: '🔬',
        border: 'border-purple-600',
        badgeColor: 'bg-purple-900/40 text-purple-300',
    },
];

export function DataModeSelector({ onSelected }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(null);

    const handleConfirm = () => {
        if (!selected) return;
        setDataMode(selected);
        onSelected(selected);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-y-auto">
            <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="text-5xl mb-3">🛡️</div>
                    <h1 className="text-2xl font-bold text-white">{t('dataMode.heading')}</h1>
                    <p className="text-gray-400 text-sm">{t('dataMode.subtitle')}</p>
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
                                        <span className="font-semibold text-white">{t(`dataMode.${opt.id}.title`)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.badgeColor}`}>
                                            {t(`dataMode.${opt.id}.badge`)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400">{t(`dataMode.${opt.id}.desc`)}</p>
                                    {selected === opt.id && opt.id === 'local' && (
                                        <p className="text-xs text-yellow-300 mt-1 italic">{t('dataMode.local.desc2')}</p>
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
                        <p className="font-semibold text-purple-300">{t('dataMode.research.sharedTitle')}</p>
                        <ul className="space-y-1 text-xs text-gray-400">
                            <li>✅ {t('dataMode.research.shared1')}</li>
                            <li>✅ {t('dataMode.research.shared2')}</li>
                            <li>✅ {t('dataMode.research.shared3')}</li>
                            <li className="text-red-400">❌ {t('dataMode.research.sharedNever')}</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic">{t('dataMode.research.idNote')}</p>
                    </div>
                )}

                {/* Local warning */}
                {selected === 'local' && (
                    <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-sm text-yellow-300">
                        {t('dataMode.local.warning')}
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
                    {t('dataMode.confirm')}
                </button>

                <p className="text-center text-xs text-gray-600">{t('dataMode.footer')}</p>
            </div>
        </div>
    );
}
