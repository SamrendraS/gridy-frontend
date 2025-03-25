import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'

const L1_RPC = import.meta.env.VITE_L1_RPC_URL

const customSepolia = {
  ...sepolia,
  rpcUrls: {
    public: { http: [L1_RPC] },
    default: { http: [L1_RPC] },
  },
}

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [customSepolia],
  [
    jsonRpcProvider({
      rpc: () => ({ http: L1_RPC }),
    }),
    publicProvider(),
  ],
)

const config = createConfig({
  autoConnect: true,
  connectors: [ new InjectedConnector({ chains }) ],
  publicClient,
  webSocketPublicClient,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <App />
    </WagmiConfig>
  </React.StrictMode>,
)
