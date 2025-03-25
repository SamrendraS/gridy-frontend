// File: ./src/connectors/L1Connector.tsx
import React, { useState } from 'react';
import {
  useConnect,
  useDisconnect,
  useAccount,
  Connector,
} from 'wagmi';
import { Button, Popup } from 'pixel-retroui';
import { useAccount as useStarknetAccount, useDisconnect as useStarknetDisconnect } from '@starknet-react/core';

/**
 * L1Connector: A “Connect L1” button for Metamask, etc. using wagmi.
 * Automatically disconnects any L2 wallet upon successful L1 connection.
 */
export default function L1Connector() {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wagmi: L1
  const {
    connect,
    connectors,
    error: wagmiError,
    isLoading,
    pendingConnector,
  } = useConnect({
    onError(err) {
      setError(err.message);
    },
  });

  const { disconnect: wagmiDisconnect } = useDisconnect({
    onSuccess() {
      setError(null);
      setShowModal(false);
    },
  });
  const { isConnected: l1Connected, address } = useAccount();

  // Starknet: L2
  const starknetAcc = useStarknetAccount();
  const { disconnect: starknetDisconnect } = useStarknetDisconnect();

  const handleConnectClick = () => {
    setShowModal(true);
  };

  const handleDisconnectClick = () => {
    wagmiDisconnect();
  };

  /**
   * Attempt to connect to given Wagmi connector. If user has
   * an L2 wallet connected, disconnect it first.
   */
  async function handleConnectConnector(connector: Connector) {
    // If there's a Starknet account connected, disconnect it
    if (starknetAcc?.address) {
      try {
        starknetDisconnect();
      } catch (e) {
        console.error('Failed to disconnect L2 wallet', e);
      }
    }
    connect({ connector });
  }

  return (
    <>
      <Button
        bg="#ffffff"
        textColor="#000000"
        borderColor="#000000"
        shadow="#ffffff"
        onClick={handleConnectClick}
      >
        {l1Connected
          ? `L1: ${address?.slice(0, 6)}...${address?.slice(-4)}`
          : 'Connect L1'
        }
      </Button>

      {showModal && (
        <Popup
          title="L1 Wallet"
          onClose={() => setShowModal(false)}
          isOpen={showModal}
        >
          <div style={{ color: '#000' }}>
            {l1Connected ? (
              <>
                <p>Connected to {address}</p>
                <Button
                  bg="#ff5555"
                  textColor="#ffffff"
                  borderColor="#000000"
                  shadow="#ffffff"
                  onClick={handleDisconnectClick}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <p>Select a wallet to connect:</p>
                {connectors.map((connector: Connector) => (
                  <div key={connector.id} style={{ marginBottom: '0.5rem' }}>
                    <Button
                      disabled={!connector.ready || isLoading}
                      onClick={() => handleConnectConnector(connector)}
                      bg="#1a1a1a"
                      textColor="#ffffff"
                      borderColor="#4dfffc"
                      shadow="#000000"
                    >
                      {connector.name}
                      {!connector.ready && ' (unsupported)'}
                      {isLoading && connector.id === pendingConnector?.id && '...'}
                    </Button>
                  </div>
                ))}

                {(wagmiError || error) && (
                  <p style={{ color: 'red', marginTop: '0.5rem' }}>
                    {wagmiError?.message || error || 'Failed to connect'}
                  </p>
                )}
              </>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
