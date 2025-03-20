import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

const SEPOLIA_RPC = import.meta.env.VITE_SEPOLIA_RPC_URL;

const customSepolia = {
  ...sepolia,
  rpcUrls: {
    // wagmi v1+ requires an object with "public" + "default"
    public: { http: [SEPOLIA_RPC] },
    default: { http: [SEPOLIA_RPC] },
  },
};

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [customSepolia],
  [
    jsonRpcProvider({
      rpc: () => ({ http: SEPOLIA_RPC }),
    }),
    publicProvider(),
  ],
);

const config = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({ chains }),
  ],
  publicClient,
  webSocketPublicClient,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <App />
    </WagmiConfig>
  </React.StrictMode>,
);
