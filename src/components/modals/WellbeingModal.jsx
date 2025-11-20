import React from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { getTodayKey, genId } from '../../utils/helpers';

export default function WellbeingModal() {
    const { showWellbeingModal, setShowWellbeingModal, wellbeingForm, setWellbeingForm, showToast } = useUI();
    const { setWellbeingLogs, saveToFirebase, cycles } = useData();

    const getCurrentCycleId = () => {
        if (cycles.length === 0) return null;
        return cycles[0].id;
    };

    const submitWellbeing = async () => {
        try {
            const currentCycle = getCurrentCycleId();
            const item = {
                id: genId(),
                date: getTodayKey(),
                timestamp: new Date().toISOString(),
                cycleId: currentCycle,
                sleep: parseFloat(wellbeingForm.sleep),
                mood: parseInt(wellbeingForm.mood),
                energy: parseInt(wellbeingForm.energy),
                water: wellbeingForm.water,
                rest: wellbeingForm.rest,
                social: wellbeingForm.social,
                food: wellbeingForm.food,
                emotions: wellbeingForm.emotions,
                notes: wellbeingForm.notes
            };

            setWellbeingLogs(prev => [item, ...prev]);
            await saveToFirebase('wellbeingLogs', item);

            setWellbeingForm({ sleep: 7, mood: 5, energy: 5, water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
            setShowWellbeingModal(false);
            showToast('✓ Bem-estar guardado', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar bem-estar', 'error');
            console.error(error);
        }
    };

    if (!showWellbeingModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowWellbeingModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Check-in Bem-Estar</h3>
                    <button onClick={() => setShowWellbeingModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Horas de sono</label>
                        <input type="number" min="0" max="24" step="0.5" value={wellbeingForm.sleep} onChange={(e) => setWellbeingForm({...wellbeingForm, sleep: e.target.value})} className="bg-white border-gray-300 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Ex: 7.5" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Humor: {wellbeingForm.mood}/10</label>
                        <input type="range" min="1" max="10" value={wellbeingForm.mood} onChange={(e) => setWellbeingForm({...wellbeingForm, mood: e.target.value})} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Energia: {wellbeingForm.energy}/10</label>
                        <input type="range" min="1" max="10" value={wellbeingForm.energy} onChange={(e) => setWellbeingForm({...wellbeingForm, energy: e.target.value})} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Autocuidado hoje</label>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={wellbeingForm.water} onChange={(e) => setWellbeingForm({...wellbeingForm, water: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700">💧 Bebi água suficiente</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={wellbeingForm.rest} onChange={(e) => setWellbeingForm({...wellbeingForm, rest: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700">😴 Descansei o suficiente</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={wellbeingForm.social} onChange={(e) => setWellbeingForm({...wellbeingForm, social: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700">👥 Tive contacto social</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={wellbeingForm.food} onChange={(e) => setWellbeingForm({...wellbeingForm, food: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700">🍽️ Comi refeições nutritivas</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Emoções do dia (opcional)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['😊 Feliz', '😢 Triste', '😰 Ansioso/a', '😌 Calmo/a', '😤 Irritado/a', '💪 Motivado/a', '😴 Cansado/a', '🙏 Grato/a', '😫 Frustrado/a', '🌟 Esperançoso/a', '😐 Entediado/a', '😓 Stressado/a', '💯 Confiante', '😔 Inseguro/a', '🥺 Solitário/a', '🥰 Amado/a', '🎉 Entusiasmado/a', '😕 Confuso/a', '🌱 Orgulhoso/a', '😖 Culpado/a', '😞 Envergonhado/a', '🤗 Vulnerável', '⚡ Empoderado/a', '😣 Arrependido/a', '😊 Satisfeito/a', '🔌 Desconectado/a', '🔥 Com craving', '✨ Resiliente', '🌈 Otimista', '😩 Overwhelmed', '🤝 Apoiado/a', '🧘 Em paz'].map(emotion => (
                                <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={wellbeingForm.emotions.includes(emotion)} onChange={(e) => {
                                        if (e.target.checked) {
                                            setWellbeingForm({...wellbeingForm, emotions: [...wellbeingForm.emotions, emotion]});
                                        } else {
                                            setWellbeingForm({...wellbeingForm, emotions: wellbeingForm.emotions.filter(em => em !== emotion)});
                                        }
                                    }} className="rounded text-purple-600 focus:ring-purple-500" />
                                    <span className="text-sm text-gray-700">{emotion}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                        <textarea value={wellbeingForm.notes} onChange={(e) => setWellbeingForm({...wellbeingForm, notes: e.target.value})} className="bg-white border-gray-300 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 h-20" placeholder="Como te sentes hoje?"></textarea>
                    </div>
                    <button onClick={submitWellbeing} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium">Guardar</button>
                </div>
            </div>
        </div>
    );
}
