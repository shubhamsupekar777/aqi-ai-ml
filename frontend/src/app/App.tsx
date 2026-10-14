import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { router } from './router';
import { CityProvider } from '../context/CityContext';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <RouterProvider router={router} />
      </CityProvider>
    </QueryClientProvider>
  );
};

export default App;
