import React, { useEffect, useRef, useState } from "react"
import { Button, Card, Popup, ProgressBar } from "pixel-retroui"
import { useAccount as useWagmiAccount } from "wagmi"
import { v4 as uuidv4 } from "uuid"

import { deployBotFromL1 } from "./connectors/L1Bridge"
import { deployBotFromL2 } from "./connectors/L2Bridge"
import { checkL1Balance, checkL2Balance } from "./utils/balanceChecks"
import { fetchPlayerBots } from "./connectors/gameConnector"
import {
  L1_TOKEN_ADDRESS,
  L2_TOKEN_ADDRESS,
  REQUIRED_BOT_DEPLOY_AMOUNT,
  GAME_CONTRACT_ADDRESS,
} from "./config/constants"

import DeployingOverlay from "./components/gamified/DeployingOverlay"
import TransactionFeed, { TransactionItem } from "./components/transactions/TransactionFeed"
import "./styles.css"

export default function MainGame() {
  const wsRef = useRef<WebSocket | null>(null)

  const [stats, setStats] = useState<any>({
    totalPlayers: 0,
    deployedBots: 0,
    botsAlive: 0,
    botsDead: 0,
    diamondsMined: 0,
    totalTilesMined: 0,
  })
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  const [tileStates, setTileStates] = useState<Record<string, string>>({})
  const [currentLayer, setCurrentLayer] = useState(1)
  const [selectedTiles, setSelectedTiles] = useState<number[]>([])
  const [hoveredTile, setHoveredTile] = useState<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  const [myBots, setMyBots] = useState<string[]>([])
  const [myBotsLoading, setMyBotsLoading] = useState(false)

  const [deploying, setDeploying] = useState(false)
  const [deployMessage, setDeployMessage] = useState("")
  const [deployError, setDeployError] = useState<string | null>(null)

  const { address: l1Address, isConnected: l1Connected } = useWagmiAccount()

  const [showMyBotsTxOnly, setShowMyBotsTxOnly] = useState(false)
  const [filterLoad, setFilterLoad] = useState(false)

  const pendingTxsRef = useRef<TransactionItem[]>([])
  const [displayedTx, setDisplayedTx] = useState<TransactionItem[]>([])
  const MAX_PENDING = 500
  const MAX_DISPLAYED = 200

  // WebSocket setup
  useEffect(() => {
    wsRef.current = new WebSocket(import.meta.env.VITE_WS_URL)
    const ws = wsRef.current
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "stats" }))
      ws.send(JSON.stringify({ action: "subscribeTransactions" }))
      ws.send(JSON.stringify({
        action: "subscribeTiles",
        layer: 0,
        tileRange: "0-5000"
      }))
    }
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data)
      switch (msg.type) {
        case "stats":
          setStats({
            totalPlayers: msg.data.totalPlayers,
            deployedBots: msg.data.totalBots,
            botsAlive: msg.data.botsAlive,
            botsDead: msg.data.botsDead,
            diamondsMined: msg.data.diamondsMined,
            totalTilesMined: msg.data.totalTilesMined ?? 0,
          })
          setLeaderboard(msg.data.leaderboard || [])
          break
        case "transactions":
          msg.data.forEach((rawTx: any) => {
            const item: TransactionItem = {
              id: uuidv4(),
              transaction_hash: rawTx.transaction_hash,
              eventName: rawTx.eventName,
              data: rawTx.data,
              timestamp: rawTx.timestamp,
              blockNumber: rawTx.blockNumber,
              status: rawTx.status,
            }
            pendingTxsRef.current.push(item)
            if (pendingTxsRef.current.length > MAX_PENDING) {
              pendingTxsRef.current.shift()
            }
          })
          break
        case "tileData":
          const updated = { ...tileStates }
          for (const t of msg.data) {
            const locDec = t.location.startsWith("0x")
              ? parseInt(t.location, 16).toString()
              : t.location
            updated[locDec] = t.mine_type.toLowerCase()
          }
          setTileStates(updated)
          break
      }
    }
    ws.onclose = () => {
      // WebSocket closed
    }
    return () => {
      if (ws) ws.close()
    }
  }, [tileStates])

  // Transaction feed effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingTxsRef.current.length > 0) {
        const next = pendingTxsRef.current.shift()
        if (next) {
          setDisplayedTx((prev) => [next, ...prev].slice(0, MAX_DISPLAYED))
        }
      }
    }, 300)
    return () => clearInterval(interval)
  }, [])

  // Refresh MyBots when user changes
  useEffect(() => {
    if (GAME_CONTRACT_ADDRESS) {
      refreshMyBots()
    }
  }, [l1Address, l1Connected, getL2Address()])

  async function refreshMyBots() {
    setMyBotsLoading(true)
    try {
      const addr = getUserAddress()
      if (!addr) {
        setMyBots([])
        return
      }
      const bots = await fetchPlayerBots(GAME_CONTRACT_ADDRESS, addr)
      setMyBots(bots)
    } catch (err) {
      console.error(err)
    } finally {
      setMyBotsLoading(false)
    }
  }

  function getL2Address(): string | null {
    const starknet = (window as any).starknet
    if (!starknet || !starknet.selectedAddress) return null
    return starknet.selectedAddress
  }

  function getUserAddress(): string | null {
    const l2 = getL2Address()
    if (l2) return l2
    if (l1Connected && l1Address) return l1Address
    return null
  }

  async function handleDeployBot(tileLocation: string) {
    const addr = getUserAddress()
    if (!addr) {
      setDeployError("No wallet connected. Please connect L1 or L2 first!")
      return
    }
    setDeploying(true)
    setDeployMessage("Preparing Deployment...")

    try {
      const maybeL2 = getL2Address()
      if (maybeL2) {
        const starknet = (window as any).starknet
        if (!starknet.account) {
          throw new Error("No L2 account found. Reconnect L2 wallet?")
        }
        await checkL2Balance(starknet.account, L2_TOKEN_ADDRESS, REQUIRED_BOT_DEPLOY_AMOUNT)
        setDeployMessage("Signing L2 transaction...")
        const txHash = await deployBotFromL2(starknet.account, maybeL2, tileLocation)
        setDeployMessage(`Deploying to tile ${tileLocation} (L2 TX: ${txHash})`)
      } else if (l1Connected && l1Address) {
        await checkL1Balance(l1Address as `0x${string}`, L1_TOKEN_ADDRESS, REQUIRED_BOT_DEPLOY_AMOUNT)
        setDeployMessage("Bridging from L1 to L2...")
        const depositTx = await deployBotFromL1(
          l1Address as `0x${string}`,
          REQUIRED_BOT_DEPLOY_AMOUNT,
          BigInt(tileLocation)
        )
        setDeployMessage(`Deploy TX: ${depositTx}, crossing the chain...`)
      }

      setTimeout(() => {
        refreshMyBots()
        setDeployMessage("Deployment submitted! Waiting for chain events...")
      }, 2000)

      setTimeout(() => {
        setDeploying(false)
      }, 5000)

    } catch (err: any) {
      setDeployError(err.message || String(err))
      setDeploying(false)
    }
  }

  function handleTileClick(idx: number) {
    if (currentLayer < 4) {
      setTransitioning(true)
      setTimeout(() => {
        setSelectedTiles((p) => [...p, idx])
        setCurrentLayer((p) => p + 1)
        setTransitioning(false)
      }, 400)
      return
    }
    const rng = computeTileRange()
    if (!rng) return
    const startIndex = parseInt(rng.split("-")[0], 10)
    const tilePos = String(startIndex + idx)
    if (tileStates[tilePos] && tileStates[tilePos] !== "unmined") {
      setDeployError("Tile is already mined or has something on it.")
      return
    }
    handleDeployBot(tilePos)
  }

  function handleBackLayer() {
    if (currentLayer > 1) {
      setTransitioning(true)
      setTimeout(() => {
        setSelectedTiles((p) => p.slice(0, -1))
        setCurrentLayer((p) => p - 1)
        setTransitioning(false)
      }, 400)
    }
  }

  function computeTileRange() {
    if (currentLayer !== 4 || selectedTiles.length < 3) return null
    let startIndex = 0
    const muls = [200000, 2000, 20]
    selectedTiles.forEach((t, i) => {
      startIndex += t * muls[i]
    })
    const rangeStart = startIndex + 1
    const rangeEnd = startIndex + 20
    return `${rangeStart}-${rangeEnd}`
  }

  function renderTileIcon(idx: number) {
    if (currentLayer !== 4) return null
    const rng = computeTileRange()
    if (!rng) return null
    const [startStr] = rng.split("-")
    const startNum = parseInt(startStr, 10)
    const tilePos = String(startNum + idx)
    const st = tileStates[tilePos]
    if (st === "diamond") return <img src="/diamond.gif" alt="diamond" className="tile-overlay-gif" />
    if (st === "bomb") return <img src="/nuke.gif" alt="bomb" className="tile-overlay-gif" />
    if (st === "empty") return <img src="/hammer.gif" alt="hammer" className="tile-overlay-gif" />
    return null
  }

  function toggleMyBotsTx() {
    setFilterLoad(true)
    setTimeout(() => {
      setShowMyBotsTxOnly(!showMyBotsTxOnly)
      setFilterLoad(false)
    }, 200)
  }

  function isMyBotTx(tx: TransactionItem, botAddrs: string[]): boolean {
    if (!tx.data || tx.data.length === 0) return false
    const maybeBotAddr = tx.data[0]?.toLowerCase()
    return botAddrs.some((b) => b.toLowerCase() === maybeBotAddr)
  }

  const finalDisplayed = showMyBotsTxOnly
    ? displayedTx.filter((tx) => isMyBotTx(tx, myBots))
    : displayedTx

  const totalTxCount = pendingTxsRef.current.length + displayedTx.length

  return (
    <div className="app-container">
      <StatsRow stats={stats} />

      {deploying && (
        <DeployingOverlay
          open={deploying}
          message={deployMessage}
          onClose={() => setDeploying(false)}
        />
      )}
      {deployError && (
        <Popup isOpen={true} title="Error" onClose={() => setDeployError(null)}>
          <p style={{ color: "red" }}>{deployError}</p>
        </Popup>
      )}

      <div className="main-content">
        <Card className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 className="sidebar-title" style={{ marginBottom: 0 }}>
              My Bots ({myBots.length})
            </h3>
            <Button
              bg="#e5e5e5"
              textColor="#000"
              borderColor="#000"
              shadow="#fff"
              style={{ width: "32px", height: "32px", padding: 0 }}
              onClick={refreshMyBots}
              disabled={myBotsLoading}
            >
              🔄
            </Button>
          </div>
          {myBotsLoading && (
            <ProgressBar
              size="sm"
              color="#c381b5"
              borderColor="#000"
              progress={50}
              className="w-full mt-1"
            />
          )}
          <ul style={{ marginTop: "0.5rem", maxHeight: "160px", overflowY: "auto" }}>
            {myBots.length === 0 ? (
              <li style={{ fontSize: 14, color: "#555" }}>No bots yet</li>
            ) : (
              myBots.map((b) => (
                <li key={b}>{b.slice(0, 10)}...{b.slice(-6)}</li>
              ))
            )}
          </ul>

          <hr style={{ margin: "1rem 0", borderColor: "#999" }} />
          <h3 className="sidebar-title">Leaderboard</h3>
          <ul style={{ marginTop: "0.5rem", maxHeight: "180px", overflowY: "auto" }}>
            {leaderboard.map((p: any, i: number) => (
              <li key={i}>
                {i + 1}. {p.player?.slice(0, 10) || (p._id ?? "").slice(0,10)}
                ... = {p.score ?? p.total_score} pts
              </li>
            ))}
          </ul>
        </Card>

        <div className={`grid-section ${transitioning ? "fade-out" : "fade-in"}`}>
          {currentLayer > 1 && (
            <Button onClick={handleBackLayer}>
              ← Back to Layer {currentLayer - 1}
            </Button>
          )}
          <div
            className="grid-container"
            style={{
              gridTemplateColumns: currentLayer === 4
                ? "repeat(4, 0.5fr)"
                : "repeat(10, 0.5fr)",
            }}
          >
            {Array(currentLayer === 4 ? 20 : 100)
              .fill(0)
              .map((_, idx) => (
                <div
                  key={idx}
                  className="tile"
                  style={{
                    width: currentLayer === 4 ? 110 : 44,
                    height: currentLayer === 4 ? 95 : 44,
                    border: "2px dashed black",
                    backgroundImage: `url("/tile_${currentLayer}.png")`,
                    backgroundSize: "cover",
                  }}
                  onMouseEnter={() => setHoveredTile(idx)}
                  onMouseLeave={() => setHoveredTile(null)}
                  onClick={() => handleTileClick(idx)}
                >
                  {renderTileIcon(idx)}
                </div>
              ))}
          </div>
          {hoveredTile !== null && (
            <div className="hover-info">
              Layer {currentLayer}, tile {hoveredTile + 1} → {computeTileRange() || ""}
            </div>
          )}
        </div>

        <Card className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 className="sidebar-title" style={{ marginBottom: 0 }}>
              Transactions ({totalTxCount})
            </h3>
            <Button
              bg={showMyBotsTxOnly ? "#c381b5" : "#e5e5e5"}
              textColor={showMyBotsTxOnly ? "#fff" : "#000"}
              borderColor="#000"
              shadow="#fff"
              style={{ fontSize: "0.8rem" }}
              onClick={toggleMyBotsTx}
            >
              {showMyBotsTxOnly ? "MyBots TX" : "All TX"}
            </Button>
          </div>
          {filterLoad && (
            <ProgressBar
              size="sm"
              color="#c381b5"
              borderColor="#000"
              progress={60}
              className="w-full mt-1"
            />
          )}
          <TransactionFeed transactions={finalDisplayed} />
        </Card>
      </div>
    </div>
  )
}

function StatsRow({ stats }: { stats: any }) {
  const icons: Record<string, string> = {
    totalPlayers: "/mario.gif",
    deployedBots: "/hammer.gif",
    botsAlive: "/heart.gif",
    botsDead: "/skull.gif",
    diamondsMined: "/diamond.gif",
    totalTilesMined: "/mining.gif",
  }
  const statKeys = Object.keys(stats)

  return (
    <div className="stats-container">
      {statKeys.map((key) => {
        const label = key.replace(/([A-Z])/g, " $1").trim()
        const value = stats[key]
        const icon = icons[key] || ""
        return (
          <Card key={key} className="stats-card">
            <div className="stats-container">
              <div className="gif-container">
                {icon && <img src={icon} alt={label} className="stat-gif" />}
              </div>
              <div>
                <span className="stats-label">{label}</span>
                <div className="stats-value">{value}</div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
