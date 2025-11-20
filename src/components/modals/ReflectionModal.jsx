import React, { useMemo } from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { getTodayKey, genId } from '../../utils/helpers';
import { dbtQuestions, reflectiveQuestions } from '../../data/constants';

export default function ReflectionModal() {
    const { showReflectionModal, setShowReflectionModal, reflectionAnswer, setReflectionAnswer, showToast } = useUI();
    const { setReflections, saveToFirebase, cycles } = useData();

    const getCurrentCycleIndex = () => {
        if (cycles.length === 0) return 0;
        return cycles.length - 1;
    };

    const currentDbtQuestion = useMemo(() => {
        const cycleIndex = getCurrentCycleIndex();
        return dbtQuestions[cycleIndex % dbtQuestions.length];
    }, [cycles.length]);

    const submitReflection = async () => {
        try {
            const item = {
                id: genId(),
                date: getTodayKey(),
                timestamp: new Date().toISOString(),
                question: currentDbtQuestion,
                answer: reflectionAnswer
            };

            setReflections(prev => [item, ...prev]);
            await saveToFirebase('reflections', item);

            setReflectionAnswer('');
            setShowReflectionModal(false);
            showToast('✓ Reflexão guardada', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar reflexão', 'error');
            console.error(error);
        }
    };

    if (!showReflectionModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowReflectionModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Reflexão DBT</h3>
                    <button onClick={() => setShowReflectionModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-purple-900 font-medium">{currentDbtQuestion}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">A tua reflexão</label>
                        <textarea value={reflectionAnswer} onChange={(e) => setReflectionAnswer(e.target.value)} className="bg-white border-gray-300 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-32" placeholder="Escreve os teus pensamentos..."></textarea>
                    </div>
                    <button onClick={submitReflection} className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium">Guardar</button>
                </div>
            </div>
        </div>
    );
}
