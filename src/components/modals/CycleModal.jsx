import React from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { genId } from '../../utils/helpers';

export default function CycleModal() {
    const { showCycleModal, setShowCycleModal, cycleForm, setCycleForm, showToast } = useUI();
    const { setCycles, saveToFirebase } = useData();

    const submitCycle = async () => {
        try {
            const item = {
                id: genId(),
                timestamp: new Date().toISOString(),
                bedtime: cycleForm.bedtime,
                triggers: cycleForm.triggers,
                notes: cycleForm.notes,
                lastBefore00: cycleForm.lastBefore00
            };

            setCycles(prev => [item, ...prev]);
            await saveToFirebase('cycles', item);

            setCycleForm({ bedtime: '', triggers: [], notes: '', lastBefore00: false });
            setShowCycleModal(false);
            showToast('✓ Novo ciclo criado', 'success');
        } catch (error) {
            showToast('✗ Erro ao criar ciclo', 'error');
            console.error(error);
        }
    };

    if (!showCycleModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCycleModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">🌙 Novo Ciclo</h3>
                    <button onClick={() => setShowCycleModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Marcar um novo ciclo muda a frase motivacional e a reflexão diária.</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hora a que te deitaste</label>
                        <input type="time" value={cycleForm.bedtime} onChange={(e) => setCycleForm({...cycleForm, bedtime: e.target.value})} className="bg-white border-gray-300 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gatilhos identificados</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Stress', 'Ansiedade', 'Solidão', 'Festa', 'Trabalho', 'Família', 'Hábito', 'Tristeza', 'Dependência', 'Tédio', 'Cansaço', 'Dor física', 'Insónia', 'Conflito', 'Celebração'].map(trigger => (
                                <label key={trigger} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={cycleForm.triggers.includes(trigger)} onChange={(e) => {
                                        if (e.target.checked) {
                                            setCycleForm({...cycleForm, triggers: [...cycleForm.triggers, trigger]});
                                        } else {
                                            setCycleForm({...cycleForm, triggers: cycleForm.triggers.filter(t => t !== trigger)});
                                        }
                                    }} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-sm text-gray-700">{trigger}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Notas sobre este ciclo (opcional)</label>
                        <textarea value={cycleForm.notes} onChange={(e) => setCycleForm({...cycleForm, notes: e.target.value})} className="bg-white border-gray-300 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 h-20" placeholder="Como foi o ciclo? O que observaste?"></textarea>
                    </div>
                    <div className="bg-green-50 border-green-200 rounded-lg p-3 border">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={cycleForm.lastBefore00} onChange={(e) => setCycleForm({...cycleForm, lastBefore00: e.target.checked})} className="rounded text-green-600 focus:ring-green-500 w-5 h-5" />
                            <span className="text-sm font-medium text-green-800">✓ Último consumo do ciclo foi antes da meia-noite (00h)</span>
                        </label>
                    </div>
                    <button onClick={submitCycle} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-medium">Iniciar Novo Ciclo</button>
                </div>
            </div>
        </div>
    );
}
