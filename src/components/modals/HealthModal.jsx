import React, { useState, useEffect } from 'react';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const SYMPTOM_TAGS = [
  { id: 'ansiedade', label: 'Ansiedade', emoji: '😰' },
  { id: 'retencao_liquidos', label: 'Retenção de líquidos', emoji: '💧' },
  { id: 'desmaio', label: 'Desmaio / tontura', emoji: '😵' },
  { id: 'dor_cabeca', label: 'Dor de cabeça', emoji: '🤕' },
  { id: 'nausea', label: 'Náusea', emoji: '🤢' },
  { id: 'insonia', label: 'Insónia', emoji: '🌙' },
  { id: 'fadiga', label: 'Fadiga', emoji: '😴' },
  { id: 'dor_muscular', label: 'Dores musculares', emoji: '💪' },
  { id: 'sudorese', label: 'Sudorese', emoji: '🥵' },
  { id: 'palpitacoes', label: 'Palpitações', emoji: '❤️' },
  { id: 'irritabilidade', label: 'Irritabilidade', emoji: '😤' },
  { id: 'falta_apetite', label: 'Falta de apetite', emoji: '🍽️' },
];

export const HealthModal = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [datetime, setDatetime] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (selectedTags.length === 0 && !customSymptom.trim()) return;
    onSubmit({ datetime, selectedTags, customSymptom: customSymptom.trim(), notes: notes.trim() });
    setSelectedTags([]);
    setCustomSymptom('');
    setNotes('');
  };

  useModalKeyboard(isOpen, onClose, handleSubmit);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDatetime(local);
      setSelectedTags([]);
      setCustomSymptom('');
      setNotes('');
    }
  }, [isOpen]);

  const toggleTag = (id) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  const hasContent = selectedTags.length > 0 || customSymptom.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">🩺 Saúde</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>

        <div className="space-y-4">
          {/* Datetime */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Data e hora</label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Symptom tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">O que sentes?</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_TAGS.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all border ' +
                    (selectedTags.includes(tag.id)
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                  }
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom symptom */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Outro <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-400 text-sm"
              placeholder="Descreve o que sentes..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notas <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-400 text-sm h-16"
              placeholder="Contexto adicional..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!hasContent}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
