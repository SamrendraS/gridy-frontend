import React, { useState } from 'react';
import { useConnect, useDisconnect, useAccount, Connector } from 'wagmi';
import { Button, Popup } from 'pixel-retroui';

/**
 * L1Connector: “Connect L1” button for Metamask or other injected EVM providers.
 */
export default function L1Connector() {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // wagmi hooks
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

  const { disconnect } = useDisconnect({
    onSuccess() {
      setError(null);
      setShowModal(false);
    },
  });

  const { isConnected, address } = useAccount();

  const handleConnectClick = () => {
    setShowModal(true);
  };

  const handleDisconnectClick = () => {
    disconnect();
  };

  return (
    <>
      <Button
        bg="#ffffff"
        textColor="#000000"
        borderColor="#000000"
        shadow="#ffffff"
        onClick={handleConnectClick}
      >
        {isConnected
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
            {isConnected ? (
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
                      onClick={() => connect({ connector })}
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

                {wagmiError && (
                  <p style={{ color: 'red', marginTop: '0.5rem' }}>
                    {wagmiError.message || 'Failed to connect'}
                  </p>
                )}

                {error && (
                  <p style={{ color: 'red', marginTop: '0.5rem' }}>
                    {error}
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
