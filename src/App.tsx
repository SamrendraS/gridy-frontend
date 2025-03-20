import React, { useState } from 'react';
import { StarknetProvider } from './StarknetProvider';
import LandingPage from './LandingPage';
import MainGame from './MainGame';

export default function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <StarknetProvider>
      {isGameStarted ? (
        <MainGame />
      ) : (
        <LandingPage onStartGame={() => setIsGameStarted(true)} />
      )}
    </StarknetProvider>
  );
}
