import React from 'react';
import * as Icons from '../components/Icons';

/**
 * HistoryView - Shows historical data with temporal and topic filters
 * This is a simpler wrapper - the complex logic stays in App for now
 */
export function HistoryView({ children, darkMode }) {
  return <div className="space-y-6">{children}</div>;
}
