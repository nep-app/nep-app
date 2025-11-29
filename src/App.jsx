
// WARNING: This file is extremely large (5000+ lines).
// It contains the entire application logic for the NEP Harm Reduction App.
//
// Structure:
// 1. Imports
// 2. Constants & Configuration
// 3. Helper Functions (that require React context/hooks)
// 4. Main Component (App)
//    - State Management (Context access)
//    - Data Filtering Logic
//    - Render Logic (Views)
//
// TODO: Refactor this into smaller components.

import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// Import Icons (using emojis for now to avoid dependency issues in this single-file version)
// In a real build, we'd use lucide-react or similar.

// Import Services/Utils
import {
  formatDate,
  formatDateForInput,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  calculateDaysDifference,
  generateId
} from './utils/helpers';

import {
  analyzeSentiment,
  analyzeMultipleNotes,
  identifyThemes,
  calculateCorrelations,
  predictNextEpisode
} from './services/analyticsService';

// Import Contexts
import { useUI } from './contexts/UIContext';
import { useData } from './contexts/DataContext';

// Import Components (assumed to be available or defined below in a real split codebase)
// For this monolithic file, we define sub-components here if they are small,
// or import them if they exist in the file system.
import ErrorBoundary from './components/ErrorBoundary';

// Theme Configuration
const THEME = {
  colors: {
    primary: 'purple',
    secondary: 'pink',
    success: 'green',
    warning: 'yellow',
    danger: 'red',
    info: 'blue',
    neutral: 'gray'
  }
};

// ==========================================
// SUB-COMPONENTS (DEFINED HERE FOR PORTABILITY)
// ==========================================

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = 'gray', className = '' }) => {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    pink: 'bg-pink-100 text-pink-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.gray} ${className}`}>
      {children}
    </span>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function App() {
  // Global State (Context)
  const {
    currentView,
    setCurrentView,
    activeModal,
    openModal,
    closeModal,
    darkMode,
    toggleDarkMode,
    isLoading: uiLoading
  } = useUI();

  const {
    consumptions,
    dailyLogs,
    wellbeingLogs,
    goals,
    cycles,
    thoughts,
    reflections,
    addConsumption,
    updateConsumption,
    deleteConsumption,
    addDailyLog,
    addWellbeingLog,
    addGoal,
    updateGoal,
    deleteGoal,
    addCycle,
    updateCycle,
    finishCycle,
    addThought,
    addReflection,
    loading: dataLoading,
    exportData,
    importData
  } = useData();

  // Local State for Views
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('semana'); // semana, mes, ano
  const [showFilters, setShowFilters] = useState(false);

  // Dashboard State
  const [dashboardTab, setDashboardTab] = useState('overview'); // overview, trends, insights

  // History State
  const [historyFilter, setHistoryFilter] = useState('all'); // all, consumptions, logs, etc.

  // Analysis State
  const [analysisPeriod, setAnalysisPeriod] = useState('month');

  // Computed Values
  const today = new Date();
  const greeting = useMemo(() => {
    const hour = today.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 20) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Theme Classes
  const themeClasses = {
    container: (dark) => dark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900',
    card: (dark) => dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900',
    textPrimary: (dark) => dark ? 'text-white' : 'text-gray-900',
    textSecondary: (dark) => dark ? 'text-gray-400' : 'text-gray-500',
    textPrimaryAlt: (dark) => dark ? 'text-purple-300' : 'text-purple-600',
  };

  // Helper to filter data by date range
  const filterByDateRange = (data, range, dateField = 'timestamp') => {
    if (!data || !range) return [];
    return data.filter(item => {
      const date = new Date(item[dateField] || item.date || item.createdAt);
      return date >= range.start && date <= range.end;
    });
  };

  // Calculate Date Ranges
  const getDateRange = (period, date = new Date()) => {
    let start, end;
    switch (period) {
      case 'semana':
        start = getStartOfWeek(date);
        end = getEndOfWeek(date);
        break;
      case 'mes':
        start = getStartOfMonth(date);
        end = getEndOfMonth(date);
        break;
      default: // hoje
        start = new Date(date.setHours(0,0,0,0));
        end = new Date(date.setHours(23,59,59,999));
    }
    return { start, end };
  };

  // RENDER LOADING
  if (uiLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-800 font-medium">A carregar a tua segurança...</p>
        </div>
      </div>
    );
  }

  // RENDER APP
  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.container(darkMode)}`}>
      {/* NAVIGATION BAR (Mobile First) */}
      <nav className={`fixed bottom-0 w-full z-50 border-t ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} pb-safe`}>
        <div className="flex justify-around items-center h-16 px-2">
          <NavButton
            icon="🏠"
            label="Início"
            active={currentView === 'home'}
            onClick={() => setCurrentView('home')}
            darkMode={darkMode}
          />
          <NavButton
            icon="📊"
            label="Padrões"
            active={currentView === 'patterns'}
            onClick={() => setCurrentView('patterns')}
            darkMode={darkMode}
          />
          <div className="relative -top-5">
            <button
              onClick={() => openModal('new-entry')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform transition hover:scale-105"
            >
              <span className="text-2xl">+</span>
            </button>
          </div>
          <NavButton
            icon="📅"
            label="Histórico"
            active={currentView === 'history'}
            onClick={() => setCurrentView('history')}
            darkMode={darkMode}
          />
          <NavButton
            icon="⚙️"
            label="Definições"
            active={currentView === 'settings'}
            onClick={() => setCurrentView('settings')}
            darkMode={darkMode}
          />
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="pb-24 px-4 pt-4 max-w-lg mx-auto md:max-w-4xl">

        {/* TOP BAR */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-xl font-bold ${themeClasses.textPrimary(darkMode)}`}>NEP</h1>
            <p className={`text-xs ${themeClasses.textSecondary(darkMode)}`}>Harm Reduction Tracker</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-purple-100 text-purple-800'}`}
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
            <button
              onClick={() => openModal('profile')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"
            >
              J
            </button>
          </div>
        </header>

        {/* VIEWS */}
        <ErrorBoundary>
          {currentView === 'home' && (
            <HomeView
              greeting={greeting}
              consumptions={consumptions}
              dailyLogs={dailyLogs}
              wellbeingLogs={wellbeingLogs}
              darkMode={darkMode}
              onAddConsumption={() => openModal('new-consumption')}
              onAddLog={() => openModal('daily-log')}
              onCheckIn={() => openModal('wellbeing')}
            />
          )}

          {currentView === 'patterns' && (
            <PatternsView
              consumptions={consumptions}
              dailyLogs={dailyLogs}
              wellbeingLogs={wellbeingLogs}
              cycles={cycles}
              reflections={reflections}
              goals={goals}
              darkMode={darkMode}
              period={selectedPeriod}
              setPeriod={setSelectedPeriod}
              themeClasses={themeClasses}
              filterByDateRange={filterByDateRange}
              getDateRange={getDateRange}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              consumptions={consumptions}
              dailyLogs={dailyLogs}
              wellbeingLogs={wellbeingLogs}
              darkMode={darkMode}
              filter={historyFilter}
              setFilter={setHistoryFilter}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              exportData={exportData}
              importData={importData}
            />
          )}
        </ErrorBoundary>

      </main>

      {/* MODALS */}
      {activeModal && (
        <ModalManager
          activeModal={activeModal}
          closeModal={closeModal}
          data={{ consumptions, dailyLogs, wellbeingLogs, goals, cycles, thoughts }}
          actions={{ addConsumption, addDailyLog, addWellbeingLog, addGoal, addThought, addReflection }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

// ==========================================
// VIEW COMPONENTS
// ==========================================

function HomeView({ greeting, consumptions, dailyLogs, wellbeingLogs, darkMode, onAddConsumption, onAddLog, onCheckIn }) {
  // Logic to show summary cards, quick actions, today's status
  const lastConsumption = consumptions[0]; // Assuming sorted
  const lastWellbeing = wellbeingLogs[0];

  return (
    <div className="space-y-6">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-2xl shadow-sm border border-gray-100`}>
        <h2 className="text-2xl font-bold mb-1">{greeting}, João</h2>
        <p className="text-gray-500">Pronto para mais um dia consciente?</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button onClick={onCheckIn} className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col items-center gap-2 hover:bg-purple-100 transition">
            <span className="text-2xl">😊</span>
            <span className="text-sm font-medium text-purple-900">Check-in</span>
          </button>
          <button onClick={onAddConsumption} className="p-4 bg-pink-50 rounded-xl border border-pink-100 flex flex-col items-center gap-2 hover:bg-pink-100 transition">
            <span className="text-2xl">💊</span>
            <span className="text-sm font-medium text-pink-900">Registo</span>
          </button>
        </div>
      </div>

      {/* Simplified Recent Activity */}
      <div>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Atividade Recente</h3>
        <div className="space-y-3">
          {consumptions.slice(0, 3).map(c => (
            <div key={c.id} className={`p-4 rounded-xl flex justify-between items-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 border'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  💊
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.substance || 'Substância'}</p>
                  <p className="text-xs text-gray-500">{formatDate(c.date)}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-400">{c.dose}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatternsView({
  consumptions, dailyLogs, wellbeingLogs, cycles, reflections, goals,
  darkMode, period, setPeriod, themeClasses, filterByDateRange, getDateRange
}) {
  const [patternsPeriod, setPatternsPeriod] = useState('semana');
  // Logic for charts and analysis

  // Example of using the filtered data that was causing syntax errors before
  const dateRange = getDateRange(patternsPeriod);
  const filteredConsumptions = filterByDateRange(consumptions, dateRange);
  const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
  const filteredCycles = filterByDateRange(cycles, dateRange);
  const filteredDailyLogs = filterByDateRange(dailyLogs, dateRange);
  const allNotes = reflections || []; // Placeholder

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-bold ${themeClasses.textPrimary(darkMode)}`}>Análise</h2>
        <select
          value={patternsPeriod}
          onChange={(e) => setPatternsPeriod(e.target.value)}
          className={`px-3 py-1 rounded-lg text-sm border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}
        >
          <option value="semana">Semana</option>
          <option value="mes">Mês</option>
          <option value="ano">Ano</option>
        </select>
      </div>

      {/* DASHBOARD COMPACTO */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${themeClasses.card(darkMode)}`}>
          <p className="text-xs text-gray-500">Consumos</p>
          <p className="text-2xl font-bold">{filteredConsumptions.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${themeClasses.card(darkMode)}`}>
          <p className="text-xs text-gray-500">Humor Médio</p>
          <p className="text-2xl font-bold">
            {filteredWellbeingLogs.length > 0
              ? (filteredWellbeingLogs.reduce((acc, l) => acc + (l.score || 0), 0) / filteredWellbeingLogs.length).toFixed(1)
              : '-'
            }
          </p>
        </div>
      </div>

      {/* SENTIMENT ANALYSIS SECTION (Fixed Syntax Errors Here) */}
      <div className={`p-6 rounded-xl border ${themeClasses.card(darkMode)}`}>
        <h3 className="font-bold mb-4">Análise de Sentimento</h3>
        {allNotes.length > 0 ? (
          <div>
            {(() => {
              // Safe block for analysis logic
              const sentimentAnalysis = analyzeMultipleNotes(allNotes);
              const sentimentScore = sentimentAnalysis.score;

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">
                      {sentimentScore > 0.5 ? '😄' : sentimentScore < -0.5 ? '😔' : '😐'}
                    </span>
                    <div>
                      <p className="font-medium">Tom Geral</p>
                      <p className="text-sm text-gray-500">Baseado em {allNotes.length} reflexões</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Sem dados suficientes para análise.</p>
        )}
      </div>
    </div>
  );
}

function HistoryView({ consumptions, darkMode }) {
  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Histórico</h2>
      <div className="space-y-2">
        {consumptions.map(item => (
          <div key={item.id} className={`p-4 border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between">
               <span className="font-medium">{item.substance}</span>
               <span className="text-gray-500 text-sm">{formatDate(item.date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ darkMode, exportData }) {
  return (
    <div className="space-y-6">
      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Definições</h2>

      <button
        onClick={exportData}
        className="w-full p-4 bg-purple-100 text-purple-800 rounded-xl font-medium"
      >
        Exportar Dados (Backup)
      </button>

      <div className="text-center text-xs text-gray-400 mt-8">
        v1.0.0 • NEP App
      </div>
    </div>
  );
}

// ==========================================
// HELPERS (UI)
// ==========================================

function NavButton({ icon, label, active, onClick, darkMode }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 ${active ? 'text-purple-600' : 'text-gray-400'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// Dummy Modal Manager for structure
function ModalManager({ activeModal, closeModal, actions }) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">
            {activeModal === 'new-consumption' && 'Novo Registo'}
            {activeModal === 'wellbeing' && 'Como te sentes?'}
          </h3>
          <button onClick={closeModal} className="p-2 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-dashed border-2">
          Formulário para {activeModal}
        </div>
      </div>
    </div>
  );
}
