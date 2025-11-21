import React, { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Main navigation
  const [selectedTab, setSelectedTab] = useState('dashboard');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showWellbeingModal, setShowWellbeingModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCopingModal, setShowCopingModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);

  // Edit states
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingCycle, setEditingCycle] = useState(null);

  // Analysis filters
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [analysisWellbeing, setAnalysisWellbeing] = useState([]);
  const [analysisConsumptions, setAnalysisConsumptions] = useState([]);

  // Education modal content
  const [educationContent, setEducationContent] = useState({ title: '', content: '' });

  // Persist dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Helper to open education modal
  const openEducationModal = (title, content) => {
    setEducationContent({ title, content });
    setShowEducationModal(true);
  };

  // Helper to close all modals
  const closeAllModals = () => {
    setShowModal(false);
    setShowReflectionModal(false);
    setShowWellbeingModal(false);
    setShowCycleModal(false);
    setShowGoalModal(false);
    setShowCopingModal(false);
    setShowEducationModal(false);
    setEditingGoal(null);
    setEditingCycle(null);
  };

  const value = {
    // Theme
    darkMode,
    setDarkMode,

    // Navigation
    selectedTab,
    setSelectedTab,

    // Modals
    showModal,
    setShowModal,
    showReflectionModal,
    setShowReflectionModal,
    showWellbeingModal,
    setShowWellbeingModal,
    showCycleModal,
    setShowCycleModal,
    showGoalModal,
    setShowGoalModal,
    showCopingModal,
    setShowCopingModal,
    showEducationModal,
    setShowEducationModal,

    // Edit states
    editingGoal,
    setEditingGoal,
    editingCycle,
    setEditingCycle,

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
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
