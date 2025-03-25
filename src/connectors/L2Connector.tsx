// File: ./src/connectors/L2Connector.tsx
import React, { useState } from 'react';
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import WalletConnector from '../WalletConnector';

/**
 * L2Connector:
 * - Renders a "Connect L2" button (actually from WalletConnector).
 * - If the user attempts to connect L2 while L1 is already connected, we auto-disconnect from L1.
 * - Maintains local state of isConnected, address, providerName for L2 usage.
 */
export default function L2Connector() {
  // Track L2 connection state ourselves
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | undefined>(undefined);
  const [connectedProvider, setConnectedProvider] = useState<string | undefined>(undefined);

  // L1 state from Wagmi
  const { isConnected: l1Connected } = useWagmiAccount();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();

  function handleConnect(address: string, providerName: string) {
    // If L1 is connected, disconnect it first
    if (l1Connected) {
      wagmiDisconnect();
    }
    setIsConnected(true);
    setConnectedAddress(address);
    setConnectedProvider(providerName);
  }

  function handleDisconnect() {
    setIsConnected(false);
    setConnectedAddress(undefined);
    setConnectedProvider(undefined);
  }

  return (
    <WalletConnector
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      isConnected={isConnected}
      connectedAddress={connectedAddress}
      connectedProvider={connectedProvider}
    />
  );
}
