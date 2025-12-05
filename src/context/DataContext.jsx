import React, { createContext, useContext } from 'react';
const DataContext = createContext({
  data: [],
  goals: [],
  consumptions: [],
  dailyLogs: [],
  reflections: [],
  wellbeingLogs: [],
  cycles: [],
  thoughts: [],
  addConsumption: () => {},
  deleteConsumption: () => {},
  // ... add other stubs as needed
});
export const useData = () => useContext(DataContext);
export default DataContext;
