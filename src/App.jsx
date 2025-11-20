import React, { useEffect } from 'react';
import * as Icons from './components/Icons';
import { useUI } from './contexts/UIContext';
import { useData } from './contexts/DataContext';

// Views
import HomeView from './components/views/HomeView';
import PatternsView from './components/views/PatternsView';
import AnalysesView from './components/views/AnalysesView';
import HistoryView from './components/views/HistoryView';
import ResourcesView from './components/views/ResourcesView';

// Modals
import DailyLogModal from './components/modals/DailyLogModal';
import WellbeingModal from './components/modals/WellbeingModal';
import ReflectionModal from './components/modals/ReflectionModal';
import CycleModal from './components/modals/CycleModal';
import GoalModal from './components/modals/GoalModal';
import EditConsumptionModal from './components/modals/EditConsumptionModal';

function HarmReductionTracker() {
    const {
        currentView, setCurrentView, toasts, shouldShowReminder,
        dismissReminder, showToast, notificationsEnabled
    } = useUI();

    const {
        user, isLogin, setIsLogin, email, setEmail, password, setPassword,
        handleAuth, authError, firebaseInitialized, appError, wellbeingLogs, exportToCSV, handleLogout
    } = useData();

    const darkMode = true;

    // Apply dark mode to body (permanent)
    useEffect(() => {
        document.body.classList.add('dark');
    }, []);

    // Reminder Logic (App Level)
    useEffect(() => {
        if (!user) return;

        const checkReminders = () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                
                if (hour < 10 || hour > 22) return;

                // Check if user hasn't logged wellbeing today
                const today = new Date().toISOString().split('T')[0];
                const hasWellbeingToday = wellbeingLogs.some(w => w.date === today);

                if (!hasWellbeingToday && shouldShowReminder('wellbeing') && hour >= 18) {
                    showToast('💭 Lembrete: Ainda não registaste bem-estar hoje', 'info');
                    dismissReminder('wellbeing');
                }
            } catch (e) {
                console.error('Error checking reminders:', e);
            }
        };

        const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
        checkReminders(); // Check immediately

        return () => clearInterval(interval);
    }, [user, wellbeingLogs, shouldShowReminder, dismissReminder, showToast]);

    // Error Boundary Fallback
    if (appError) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-red-600 mb-4">⚠️ Erro</h1>
                <p className="text-gray-700 mb-4">Ocorreu um erro ao carregar a aplicação.</p>
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 font-mono">{appError}</div>
                <button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">
                    Recarregar Página
                </button>
            </div>
        </div>
    );

    if (!firebaseInitialized) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            <div className="text-purple-600 text-xl">A carregar... 🔄</div>
        </div>
    );

    // Login Screen
    if (!user) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">NEP app</h1>
                <p className="text-gray-600 mb-6">Sincroniza entre dispositivos 💜</p>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                    <input type="password" placeholder="Password (mínimo 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                    {authError && (<div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{authError}</div>)}
                    <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-purple-600 text-sm hover:underline">{isLogin ? 'Criar conta nova' : 'Já tenho conta'}</button>
                </form>
                <p className="text-xs text-gray-500 mt-6">💡 Usa o mesmo email e password no PC e telemóvel para sincronizar</p>
            </div>
        </div>
    );

    return (
        <div className={'min-h-screen ' + (darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50') + ' p-4 transition-colors pb-24'}>
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className={(darkMode ? 'bg-gray-800 text-white' : 'bg-white') + ' rounded-3xl shadow-xl p-8 mb-6'}>
                    <div className="flex justify-between items-center gap-8">
                        <div className="flex-1">
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-purple-600 leading-none">N</span>
                                    <span className={'text-2xl font-light ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>otas de</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-pink-600 leading-none">E</span>
                                    <span className={'text-2xl font-light ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>xperiências e</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-blue-600 leading-none">P</span>
                                    <span className={'text-2xl font-light ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>adrões</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <div className="text-right space-y-1">
                                <p className={'text-sm font-medium tracking-wide ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                    <span className="text-purple-600 font-bold">N</span>otice it. <span className="text-pink-600 font-bold">E</span>xplore it. <span className="text-blue-600 font-bold">P</span>lan it.
                                </p>
                                <p className={'text-xs italic ' + (darkMode ? 'text-gray-500' : 'text-gray-500')}>
                                    <span className="text-purple-500">N</span>ão <span className="text-pink-500">E</span>stás <span className="text-blue-500">P</span>erdida.
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={exportToCSV} className="text-gray-500 hover:text-gray-300 p-2 rounded-lg transition-colors" title="Exportar dados"><Icons.Download className="w-4 h-4" /></button>
                                <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 p-2 rounded-lg transition-colors" title="Sair"><Icons.LogOut className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={(darkMode ? 'bg-gray-800/50' : 'bg-white') + ' rounded-3xl shadow-xl p-6 mb-6'}>
                    {currentView === 'home' && <HomeView />}
                    {currentView === 'patterns' && <PatternsView />}
                    {currentView === 'analyses' && <AnalysesView />}
                    {currentView === 'history' && <HistoryView />}
                    {currentView === 'resources' && <ResourcesView />}
                </div>

                {/* Navigation Bar */}
                <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' fixed bottom-0 left-0 right-0 shadow-xl rounded-t-3xl p-4'}>
                    <div className="max-w-2xl mx-auto">
                        <div className="grid grid-cols-5 gap-1">
                            <button onClick={() => setCurrentView('home')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'home' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.Heart className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Início</div>
                            </button>
                            <button onClick={() => setCurrentView('patterns')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'patterns' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.BarChart3 className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Padrões</div>
                            </button>
                            <button onClick={() => setCurrentView('analyses')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'analyses' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.Activity className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Análises</div>
                            </button>
                            <button onClick={() => setCurrentView('history')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'history' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.BookOpen className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Histórico</div>
                            </button>
                            <button onClick={() => setCurrentView('resources')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'resources' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.TrendingDown className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Recursos</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <DailyLogModal />
            <WellbeingModal />
            <ReflectionModal />
            <CycleModal />
            <GoalModal />
            <EditConsumptionModal />

            {/* Toast Notifications */}
            <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 px-4 pointer-events-none z-50">
                {toasts.map(toast => (
                    <div key={toast.id} className={'px-4 py-3 rounded-lg shadow-lg font-medium text-sm pointer-events-auto transform transition-all ' + (toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white')}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HarmReductionTracker;
