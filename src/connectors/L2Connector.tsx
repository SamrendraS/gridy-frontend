import React, { useState } from 'react'
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi'
import WalletConnector from '../WalletConnector'

export default function L2Connector() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectedAddress, setConnectedAddress] = useState<string | undefined>()
  const [connectedProvider, setConnectedProvider] = useState<string | undefined>()

  const { isConnected: l1Connected } = useWagmiAccount()
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect()

  function handleConnect(address: string, providerName: string) {
    if (l1Connected) {
      wagmiDisconnect()
    }
    setIsConnected(true)
    setConnectedAddress(address)
    setConnectedProvider(providerName)
  }

  function handleDisconnect() {
    setIsConnected(false)
    setConnectedAddress(undefined)
    setConnectedProvider(undefined)
  }

  return (
    <WalletConnector
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      isConnected={isConnected}
      connectedAddress={connectedAddress}
      connectedProvider={connectedProvider}
    />
  )
}
