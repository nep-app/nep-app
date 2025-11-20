import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { educationalResources } from '../../data/constants';

export default function ResourcesView() {
    const { notificationsEnabled, requestNotificationPermission } = useUI();
    const darkMode = true;

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Recursos</h2>
            <div className="bg-red-50 rounded-xl p-6 border border-red-200"><h3 className="font-semibold text-red-800 mb-3">🚨 Emergência</h3><div className="space-y-2 text-red-700"><p><strong>INEM:</strong> 112</p><p><strong>Linha Vida:</strong> 1414</p></div></div>
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}><h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3'}>📞 Linhas de Apoio</h3><div className={'space-y-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}><p><strong>SOS Droga:</strong> 1414 (24h)</p><p><strong>SNS 24:</strong> 808 24 24 24</p></div></div>
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3'}>🔔 Notificações & Lembretes</h3>
                <div className={'space-y-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <p className="text-sm">Recebe lembretes para registar bem-estar diariamente (às 18h).</p>
                    {notificationsEnabled ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <span>✓ Notificações ativadas</span>
                        </div>
                    ) : (
                        <button onClick={requestNotificationPermission} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium">
                            Ativar Notificações
                        </button>
                    )}
                </div>
            </div>
            {educationalResources.map((resource, i) => (
                <div key={i} className="bg-purple-50 rounded-xl p-4 border border-purple-200"><h4 className="font-medium text-purple-800 mb-2">{resource.title}</h4><p className="text-sm text-purple-700">{resource.content}</p></div>
            ))}
        </div>
    );
}
