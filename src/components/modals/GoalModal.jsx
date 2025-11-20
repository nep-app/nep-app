import React from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { genId } from '../../utils/helpers';

export default function GoalModal() {
    const { showGoalModal, setShowGoalModal, goalForm, setGoalForm, editingGoal, setEditingGoal, showToast } = useUI();
    const { setGoals, saveToFirebase } = useData();

    const submitGoal = async () => {
        try {
            const target = goalForm.type.includes('delay') || goalForm.type.includes('limit') ? goalForm.target : parseFloat(goalForm.target);

            if (editingGoal) {
                // Update existing goal
                const updatedGoal = { ...editingGoal, type: goalForm.type, target, deadline: goalForm.deadline };
                setGoals(prev => prev.map(g => g.id === editingGoal.id ? updatedGoal : g));
                await saveToFirebase('goals', updatedGoal);
                setEditingGoal(null);
                showToast('✓ Meta atualizada', 'success');
            } else {
                // Create new goal
                const item = { id: genId(), type: goalForm.type, target, deadline: goalForm.deadline, createdAt: new Date().toISOString(), completed: false };
                setGoals(prev => [...prev, item]);
                await saveToFirebase('goals', item);
                showToast('✓ Meta criada', 'success');
            }

            setGoalForm({ type: 'reduce_frequency', target: '', deadline: '' });
            setShowGoalModal(false);
        } catch (error) {
            showToast('✗ Erro ao ' + (editingGoal ? 'atualizar' : 'criar') + ' meta', 'error');
            console.error(error);
        }
    };

    if (!showGoalModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowGoalModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{editingGoal ? 'Editar Meta' : 'Nova Meta'}</h3>
                    <button onClick={() => { setShowGoalModal(false); setEditingGoal(null); }} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta</label>
                        <select value={goalForm.type} onChange={(e) => setGoalForm({...goalForm, type: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400">
                            <option value="reduce_frequency">Reduzir Frequência</option>
                            <option value="reduce_quantity">Reduzir Quantidade (mg)</option>
                            <option value="delay_first">Adiar Primeiro Consumo</option>
                            <option value="increase_interval">Aumentar Intervalo (horas)</option>
                            <option value="limit_last">Hora do Último Consumo</option>
                            <option value="sleep_hours">Horas de Sono por Dia</option>
                            <option value="bedtime_before">Deitar Antes de</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                        <select value={goalForm.period} onChange={(e) => setGoalForm({...goalForm, period: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400">
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meta {goalForm.type.includes('delay') || goalForm.type.includes('limit') || goalForm.type.includes('bedtime') ? '(HH:MM)' : '(número)'}
                        </label>
                        <input type={goalForm.type.includes('delay') || goalForm.type.includes('limit') || goalForm.type.includes('bedtime') ? 'time' : 'number'} value={goalForm.target} onChange={(e) => setGoalForm({...goalForm, target: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                        <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({...goalForm, deadline: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                    </div>
                    <button onClick={submitGoal} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">{editingGoal ? 'Atualizar Meta' : 'Criar Meta'}</button>
                </div>
            </div>
        </div>
    );
}
