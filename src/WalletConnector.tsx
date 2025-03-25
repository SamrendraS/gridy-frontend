// File: ./src/WalletConnector.tsx
import React, { useState, useEffect } from "react";
import { Button, Card, Popup } from 'pixel-retroui';
import { connect, disconnect } from "get-starknet";

type WalletOption = {
  id: string;
  name: string;
  icon?: string;
  windowKey?: string; // e.g. 'starknet_argentX'
};

const walletOptions: WalletOption[] = [
  {
    id: "argentX",
    name: "Argent X",
    icon: "/argent.png",
    windowKey: "starknet_argentX",
  },
  {
    id: "braavos",
    name: "Braavos",
    icon: "/braavos.jpeg",
    windowKey: "starknet_braavos",
  },
];

type WalletConnectorProps = {
  /** Fired when user is fully connected (address + provider). */
  onConnect: (address: string, providerName: string) => void;
  /** Fired on full disconnect. */
  onDisconnect: () => void;
  /** Are we currently "connected" from the parent’s perspective? */
  isConnected: boolean;
  /** The current wallet address, if connected. */
  connectedAddress?: string;
  /** The name of the connected provider, if any. */
  connectedProvider?: string;
};

/**
 * A low-level Starknet wallet connector that uses "get-starknet" and attempts
 * direct injection for wallets like ArgentX or Braavos.
 */
const WalletConnector: React.FC<WalletConnectorProps> = ({
  onConnect,
  onDisconnect,
  isConnected,
  connectedAddress,
  connectedProvider,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);

  // Detect which wallets might be in window
  useEffect(() => {
    const checkWallets = () => {
      const detected = walletOptions.filter((w) => {
        return w.windowKey && (window as any)[w.windowKey];
      });
      setAvailableWallets(detected.length > 0 ? detected : walletOptions);
    };
    checkWallets();
  }, []);

  const handleConnectClick = () => {
    setShowModal(true);
    setError(null);
  };

  async function connectDirectWallet(wallet: WalletOption) {
    setIsConnecting(true);
    setCurrentWallet(wallet.id);
    setError(null);

    try {
      console.log(`Attempting to connect ${wallet.name}...`);

      // If the wallet is directly injected (windowKey)
      if (wallet.windowKey && (window as any)[wallet.windowKey]) {
        const directProvider = (window as any)[wallet.windowKey];
        // Attempt to enable
        await directProvider.enable({ showModal: true });
        // Attempt to get address
        let address: string | undefined;
        try {
          // Some wallets might support "starknet_accounts" request
          const accounts = await directProvider.request({ method: "starknet_accounts" });
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          }
        } catch (methodErr) {
          // fallback
          console.log(`Method starknet_accounts not available, fallback to direct provider props.`);
          if (directProvider.selectedAddress) {
            address = directProvider.selectedAddress;
          } else if (directProvider.account?.address) {
            address = directProvider.account.address;
          }
        }

        if (address) {
          console.log(`Connected to ${wallet.name} directly at address ${address}`);
          onConnect(address, wallet.name);
          setShowModal(false);
          setIsConnecting(false);
          return;
        }
      }

      // If the above didn't succeed, fallback to standard "connect()"
      // but note that some wallets (like Braavos) might not like the fallback approach:
      console.log("Using fallback connect() from get-starknet...");
      const starknet = await connect();
      if (!starknet) {
        throw new Error(`Failed to connect to ${wallet.name}`);
      }
      await starknet.enable();
      const walletAddress = starknet.selectedAddress;
      if (!walletAddress) {
        throw new Error("No wallet address found after fallback connect");
      }

      console.log(`Fallback connected: ${walletAddress}`);
      onConnect(walletAddress, wallet.name);
      setShowModal(false);
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      setError(`Failed to connect: ${err?.message || String(err)}`);
    } finally {
      setIsConnecting(false);
      setCurrentWallet(null);
    }
  }

  async function disconnectWallet() {
    try {
      // standard disconnect from get-starknet
      await disconnect();
      onDisconnect();
      setShowModal(false);
    } catch (err: any) {
      console.error("Wallet disconnection error:", err);
      setError(`Failed to disconnect: ${err?.message || String(err)}`);
    }
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
        {isConnected
          ? `${connectedProvider || "Starknet"} (${connectedAddress?.slice(0, 6)}...${connectedAddress?.slice(-4)})`
          : "Connect L2"
        }
      </Button>

      {showModal && (
        <Popup
          title="Starknet Wallet"
          onClose={() => setShowModal(false)}
          isOpen={showModal}
        >
          <div style={{ color: "#000" }}>
            {isConnected ? (
              <div className="connected-wallet">
                <h4>Connected Wallet</h4>
                <Card style={{ margin: "10px 0", padding: "15px" }}>
                  <div><strong>Provider:</strong> {connectedProvider || "Unknown"}</div>
                  <div><strong>Address:</strong> {connectedAddress}</div>
                  <div style={{ marginTop: "15px" }}>
                    <Button
                      onClick={disconnectWallet}
                      bg="#ff5555"
                      textColor="#ffffff"
                      borderColor="#000000"
                      shadow="#ffffff"
                    >
                      Disconnect
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="connect-wallet-section">
                <h4>Connect a Starknet Wallet</h4>
                <p>Select a wallet provider to connect:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
                  {availableWallets.map((wallet) => (
                    <Button
                      key={wallet.id}
                      onClick={() => connectDirectWallet(wallet)}
                      bg="#ffffff"
                      textColor="#000000"
                      borderColor="#000000"
                      shadow="#ffffff"
                      disabled={isConnecting && currentWallet === wallet.id}
                      style={{ display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      {wallet.icon && (
                        <img
                          src={wallet.icon}
                          alt={wallet.name}
                          style={{ width: "20px", height: "20px" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      Connect {wallet.name}
                      {isConnecting && currentWallet === wallet.id && "..."}
                    </Button>
                  ))}
                </div>
                {error && (
                  <div style={{ color: "red", marginTop: "0.5rem" }}>
                    {error}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <Button
                onClick={() => setShowModal(false)}
                bg="#444444"
                textColor="#ffffff"
                borderColor="#000000"
                shadow="#ffffff"
                disabled={isConnecting}
              >
                Close
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default WalletConnector;
