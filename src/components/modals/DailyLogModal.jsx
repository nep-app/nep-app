import React from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { getTodayKey, genId } from '../../utils/helpers';

export default function DailyLogModal() {
    const { showDailyLogModal, setShowDailyLogModal, dailyForm, setDailyForm, showToast } = useUI();
    const { consumptions, setDailyLogs, saveToFirebase, cycles } = useData();

    const getCurrentCycleId = () => {
        if (cycles.length === 0) return null;
        return cycles[0].id;
    };

    const submitDailyLog = async () => {
        try {
            const currentCycle = getCurrentCycleId();
            const todayConsumptions = consumptions.filter(c => c.date === getTodayKey()).length;
            const item = {
                id: genId(),
                date: getTodayKey(),
                timestamp: new Date().toISOString(),
                cycleId: currentCycle,
                times: todayConsumptions,
                mg: parseInt(dailyForm.mg),
                notes: dailyForm.notes
            };

            setDailyLogs(prev => [item, ...prev]);
            await saveToFirebase('dailyLogs', item);

            setDailyForm({ mg: 30, notes: '' });
            setShowDailyLogModal(false);
            showToast('✓ Registo diário guardado', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar registo', 'error');
            console.error(error);
        }
    };

    if (!showDailyLogModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowDailyLogModal(false)}>
            <div className="dark bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Registar Dosagem do Dia</h3>
                    <button onClick={() => setShowDailyLogModal(false)} className="text-gray-400 hover:text-gray-300"><Icons.X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Total aproximado (mg)</label>
                        <input type="number" value={dailyForm.mg} onChange={(e) => setDailyForm({...dailyForm, mg: e.target.value})} className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" min="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Notas (opcional)</label>
                        <textarea value={dailyForm.notes} onChange={(e) => setDailyForm({...dailyForm, notes: e.target.value})} className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-20" placeholder="Como te sentiste? Contexto..."></textarea>
                    </div>
                    <button onClick={submitDailyLog} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all font-medium shadow-lg">Guardar</button>
                </div>
            </div>
        </div>
    );
}
