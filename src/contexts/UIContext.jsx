import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { safeLocalStorage } from '../utils/storage';

const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // Theme - SEMPRE dark mode (não há light mode nesta app)
  const darkMode = true;

  // Main navigation
  const [selectedTab, setSelectedTab] = useState('dashboard');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDailyLogModal, setShowDailyLogModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showWellbeingModal, setShowWellbeingModal] = useState(false);
  const [showEmotionsModal, setShowEmotionsModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEditConsumptionModal, setShowEditConsumptionModal] = useState(false);
  const [showCopingModal, setShowCopingModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showThoughtsModal, setShowThoughtsModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Edit states
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingCycle, setEditingCycle] = useState(null);
  const [editingConsumption, setEditingConsumption] = useState(null);

  // Analysis filters
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [analysisWellbeing, setAnalysisWellbeing] = useState([]);
  const [analysisConsumptions, setAnalysisConsumptions] = useState([]);

  // Education modal content
  const [educationContent, setEducationContent] = useState({ title: '', content: '' });

  // Garantir dark mode sempre ativo
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Helper to open education modal
  const openEducationModal = useCallback((title, content) => {
    setEducationContent({ title, content });
    setShowEducationModal(true);
  }, []);

  // Helper to close all modals
  const closeAllModals = useCallback(() => {
    setShowModal(false);
    setShowDailyLogModal(false);
    setShowReflectionModal(false);
    setShowWellbeingModal(false);
    setShowEmotionsModal(false);
    setShowCycleModal(false);
    setShowGoalModal(false);
    setShowEditConsumptionModal(false);
    setShowCopingModal(false);
    setShowEducationModal(false);
    setShowThoughtsModal(false);
    setShowHealthModal(false);
    setEditingGoal(null);
    setEditingCycle(null);
    setEditingConsumption(null);
  }, []);

  const value = useMemo(() => ({
    // Theme (sempre dark mode)
    darkMode,

    // Navigation
    selectedTab,
    setSelectedTab,

    // Modals
    showModal,
    setShowModal,
    showDailyLogModal,
    setShowDailyLogModal,
    showReflectionModal,
    setShowReflectionModal,
    showWellbeingModal,
    setShowWellbeingModal,
    showEmotionsModal,
    setShowEmotionsModal,
    showCycleModal,
    setShowCycleModal,
    showGoalModal,
    setShowGoalModal,
    showEditConsumptionModal,
    setShowEditConsumptionModal,
    showCopingModal,
    setShowCopingModal,
    showEducationModal,
    setShowEducationModal,
    showThoughtsModal,
    setShowThoughtsModal,
    showHealthModal,
    setShowHealthModal,

    // Edit states
    editingGoal,
    setEditingGoal,
    editingCycle,
    setEditingCycle,
    editingConsumption,
    setEditingConsumption,

    // Analysis filters
    selectedCycle,
    setSelectedCycle,
    analysisWellbeing,
    setAnalysisWellbeing,
    analysisConsumptions,
    setAnalysisConsumptions,

    // Education
    educationContent,
    setEducationContent,
    openEducationModal,

    // Helpers
    closeAllModals,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    selectedTab, showModal, showDailyLogModal, showReflectionModal,
    showWellbeingModal, showEmotionsModal, showCycleModal, showGoalModal,
    showEditConsumptionModal, showCopingModal, showEducationModal,
    showThoughtsModal, showHealthModal, editingGoal, editingCycle, editingConsumption,
    selectedCycle, analysisWellbeing, analysisConsumptions, educationContent,
    openEducationModal, closeAllModals,
  ]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
