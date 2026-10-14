import React, { createContext, useContext, useState, useEffect } from 'react';

interface CityContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('aqi_selected_city') || 'Delhi';
  });

  useEffect(() => {
    localStorage.setItem('aqi_selected_city', selectedCity);
  }, [selectedCity]);

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
};

export function useSelectedCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useSelectedCity must be used within a CityProvider');
  }
  return context;
}
