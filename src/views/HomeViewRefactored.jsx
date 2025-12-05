import React from 'react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { useHomeAlerts } from '../hooks/useHomeAlerts';
import { useHomeStats } from '../hooks/useHomeStats';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const HomeViewRefactored = () => {
  const { data, goals } = useData();
  const { showModal } = useUI();

  // Logic extracted to custom hooks
  const { alerts, dismissAlert } = useHomeAlerts(data, goals);
  const stats = useHomeStats(data);

  if (!data) return <div className="p-4 text-center">A carregar dados...</div>;

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header & Alerts */}
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Olá, Utilizador</h1>
        <button
          onClick={() => showModal('settings')}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
        >
          ⚙️
        </button>
      </header>

      {alerts.map(alert => (
        <div key={alert.id} className={`p-4 rounded-lg flex justify-between items-center ${
          alert.type === 'warning' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          <span>{alert.message}</span>
          <button onClick={() => dismissAlert(alert.id)} className="font-bold">×</button>
        </div>
      ))}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Dias Limpo</p>
          <p className="text-3xl font-bold text-blue-600">{stats.streak}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Humor Médio</p>
          <p className="text-3xl font-bold text-purple-600">{stats.mood}</p>
        </div>
      </div>

      {/* Main Action */}
      <button
        onClick={() => showModal('entry')}
        className="w-full py-4 bg-blue-600 text-white rounded-xl shadow-lg font-semibold text-lg active:scale-95 transition-transform"
      >
        + Registar Novo Dia
      </button>

      {/* Charts Preview */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-semibold mb-4 text-gray-700">Evolução Recente</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 10]} hide />
              <Tooltip />
              <Line type="monotone" dataKey="mood" stroke="#8884d8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="craving" stroke="#82ca9d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HomeViewRefactored;
