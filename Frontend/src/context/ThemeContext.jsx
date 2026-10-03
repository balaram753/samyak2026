import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// v2: the SAMYAK 2026 visual system is black-first, so earlier saved
// choices (when white was the default) are not carried over.
const THEME_STORAGE_KEY = 'samyak_theme_v2';

export function ThemeProvider({ children }) {
  // Pure Dark Mode only (SAMYAK 2026 cyberpunk black-first system)
  const theme = 'dark';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider 
      value={{ 
        theme: 'dark', 
        setTheme: () => {}, 
        toggleTheme, 
        isLight: false, 
        isDark: true 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
