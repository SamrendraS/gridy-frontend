import React, { useState } from 'react';
import { StarknetProvider } from './StarknetProvider';
import LandingPage from './LandingPage';
import MainGame from './MainGame';
import Header from './components/Header';

export default function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <StarknetProvider>
      <div className="app-container">
        <Header />
        {isGameStarted ? (
          <MainGame />
        ) : (
          <LandingPage onStartGame={() => setIsGameStarted(true)} />
        )}
      </div>
    </StarknetProvider>
  );
}
