import React from 'react';
import { useData } from '../context/DataContext';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { useAnalysisCalculations } from '../hooks/useAnalysisCalculations';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AnalysesView = () => {
  const { data } = useData();
  const { dateRange, setDateRange, filteredData } = useAnalysisData(data);
  const calculations = useAnalysisCalculations(filteredData);

  if (!data) return <div>Carregando...</div>;

  return (
    <div className="p-4 space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-gray-800">Análise Avançada</h2>

      {/* Date Filter */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
        {['week', 'month', 'year'].map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${
              dateRange === range ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}
          >
            {range === 'week' ? 'Semana' : range === 'month' ? 'Mês' : 'Ano'}
          </button>
        ))}
      </div>

      {/* Insight Card */}
      {calculations && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-2 opacity-90">Insight do Período</h3>
          <p className="text-xl font-medium leading-relaxed">
            {calculations.insight}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm opacity-75">
            <span>Correlação: {calculations.correlation.toFixed(2)}</span>
            <span>Sentimento: {calculations.sentiment}</span>
          </div>
        </div>
      )}

      {/* Correlations Chart */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-semibold mb-4 text-gray-700">Humor vs Craving</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="mood" name="Humor" unit="" domain={[0, 10]} />
              <YAxis type="number" dataKey="craving" name="Craving" unit="" domain={[0, 10]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Registos" data={filteredData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalysesView;
