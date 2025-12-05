import React, { createContext, useContext } from 'react';
const UIContext = createContext({
  showModal: () => {},
  darkMode: false,
  showDailyLogModal: false,
  // ... stubs
});
export const useUI = () => useContext(UIContext);
export default UIContext;
