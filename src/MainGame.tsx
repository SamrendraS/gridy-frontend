"use client";
import React, { useEffect, useState, useRef } from "react";
import { Button, Card, Popup, ProgressBar } from "pixel-retroui";
import { useAccount as useStarknetAccount } from "@starknet-react/core";
import { useAccount as useWagmiAccount } from "wagmi";

import L1Connector from "./connectors/L1Connector";
import WalletConnector from "./WalletConnector";

import { deployBotFromL1 } from "./connectors/L1Bridge";
import { deployBotFromL2 } from "./connectors/L2Bridge";
import { checkL1Balance, checkL2Balance } from "./utils/balanceChecks";

import {
  L1_TOKEN_ADDRESS,
  L2_TOKEN_ADDRESS,
  REQUIRED_BOT_DEPLOY_AMOUNT,
  GAME_CONTRACT_ADDRESS,
} from "./config/constants";
import { fetchPlayerBots } from "./connectors/gameConnector";
import "./styles.css";

import DeployingOverlay from "./components/gamified/DeployingOverlay";

/**
 * MainGame: 4-layer tile approach.
 *  - Single WebSocket => stats, transaction feed, tile states
 *  - Stats row at top, MyBots (left), center tiles, Live Feed (right).
 *  - On tile click (layer 4), we deploy a new bot => show DeployingOverlay.
 */

export default function MainGame() {
  // Single WS
  const wsRef = useRef<WebSocket | null>(null);

  // Stats
  const [stats, setStats] = useState<any>({
    totalPlayers: 0,
    deployedBots: 0,
    botsAlive: 0,
    diamondsMined: 0,
    botsDead: 0,
    totalTilesMined: 0,
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Live transaction feed
  const [transactions, setTransactions] = useState<any[]>([]);

  // Tiles
  const [tileStates, setTileStates] = useState<Record<string, string>>({});
  const [currentLayer, setCurrentLayer] = useState(1);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Bot + bridging states
  const [myBots, setMyBots] = useState<string[]>([]);
  const [myBotsLoading, setMyBotsLoading] = useState(false);
  const [showMyBotsTxOnly, setShowMyBotsTxOnly] = useState(false);
  const [filterLoad, setFilterLoad] = useState(false);

  // Overlays
  const [deploying, setDeploying] = useState(false);
  const [deployMessage, setDeployMessage] = useState("");
  const [deployError, setDeployError] = useState<string | null>(null);

  // Wallet
  const { account: starknetAccount } = useStarknetAccount();
  const [l2WalletAddress, setL2WalletAddress] = useState<string | null>(null);
  const { address: l1Address, isConnected: l1IsConnected } = useWagmiAccount();

  function getUserAddress(): string | null {
    if (l2WalletAddress) return l2WalletAddress;
    if (l1IsConnected && l1Address) return l1Address;
    return null;
  }

  // ---- WebSocket Setup ----
  useEffect(() => {
    wsRef.current = new WebSocket(import.meta.env.VITE_WS_URL);
    const ws = wsRef.current;
    ws.onopen = () => {
      // Sub to stats, tileData, transactions
      ws.send(JSON.stringify({ action: "stats", channel: "stats" }));
      // ws.send(JSON.stringify({ action: "subscribe", channel: "tiles" }));
      ws.send(JSON.stringify({ action: "subscribeTransactions", channel: "transactions" }));
    };
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === "stats") {
        setStats({
          totalPlayers: data.data.totalPlayers,
          deployedBots: data.data.totalBots,
          botsAlive: data.data.botsAlive,
          botsDead: data.data.botsDead,
          diamondsMined: data.data.diamondsMined,
          totalTilesMined: data.data.totalTilesMined ?? 0,
        });
        setLeaderboard(data.data.leaderboard || []);
      } else if (data.type === "transactions") {
        // Continuous feed
        setTransactions((prev) => {
          const items = [...data.data, ...prev];
          return items.slice(0, 60);
        });
      } else if (data.type === "tileData") {
        // tile updates
        const updated = { ...tileStates };
        for (const t of data.data) {
          const locDec = t.location.startsWith("0x") ? parseInt(t.location, 16).toString() : t.location;
          updated[locDec] = t.mine_type.toLowerCase();
        }
        setTileStates(updated);
      }
    };
    ws.onclose = () => {
      console.log("WS closed");
    };
    return () => {
      ws && ws.close();
    };
  }, [tileStates]);

  // ---- My Bots ----
  useEffect(() => {
    if (starknetAccount?.address) {
      setL2WalletAddress(starknetAccount.address);
    }
  }, [starknetAccount]);

  useEffect(() => {
    const addr = getUserAddress();
    if (addr && GAME_CONTRACT_ADDRESS) {
      refreshMyBots();
    } else {
      setMyBots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l1Address, l2WalletAddress]);

  async function refreshMyBots() {
    setMyBotsLoading(true);
    try {
      const addr = getUserAddress();
      if (!addr || !GAME_CONTRACT_ADDRESS) return;
      const bots = await fetchPlayerBots(GAME_CONTRACT_ADDRESS, addr);
      setMyBots(bots);
    } catch (err) {
      console.error(err);
    } finally {
      setMyBotsLoading(false);
    }
  }

  // ---- Deploy Bot ----
  async function handleDeployBot(tileLocation: string) {
    const addr = getUserAddress();
    if (!addr) {
      setDeployError("No wallet connected. Please connect L1 or L2 first!");
      return;
    }

    setDeploying(true);
    setDeployMessage("Preparing Deployment...");
    try {
      if (l2WalletAddress) {
        await checkL2Balance(starknetAccount!, L2_TOKEN_ADDRESS, REQUIRED_BOT_DEPLOY_AMOUNT);
        setDeployMessage("Signing L2 transaction...");
        const txHash = await deployBotFromL2(starknetAccount!, l2WalletAddress, tileLocation);
        setDeployMessage(`Deploying to tile ${tileLocation} with TX: ${txHash}`);
      } else if (l1IsConnected && l1Address) {
        await checkL1Balance(l1Address, L1_TOKEN_ADDRESS, REQUIRED_BOT_DEPLOY_AMOUNT);
        setDeployMessage("Bridging from L1 to L2/L3...");
        const depositHash = await deployBotFromL1(
          l1Address as `0x${string}`,
          REQUIRED_BOT_DEPLOY_AMOUNT,
          BigInt(tileLocation)
        );
        setDeployMessage(`Deploy TX: ${depositHash}, crossing the chain...`);
      }

      // Let the WS ingestion do its job. We'll also manually refresh the bots after a short delay
      setTimeout(() => {
        refreshMyBots();
        setDeployMessage("Deployment submitted! Waiting for chain events...");
      }, 2000);

      // Hide overlay in ~5 sec. (or let user manually close)
      setTimeout(() => {
        setDeploying(false);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setDeployError(err.message || String(err));
      setDeploying(false);
    }
  }

  // ---- Layers & Tile Click ----
  function handleTileClick(index: number) {
    if (currentLayer < 4) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((p) => [...p, index]);
        setCurrentLayer((p) => p + 1);
        setTransitioning(false);
      }, 400);
      return;
    }
    // If layer=4, deploy bot
    const rng = computeTileRange();
    if (!rng) return;
    const startIndex = parseInt(rng.split("-")[0], 10);
    const tilePos = String(startIndex + index);
    if (tileStates[tilePos] && tileStates[tilePos] !== "unmined") {
      setDeployError("Tile is already mined or has something.");
      return;
    }
    handleDeployBot(tilePos);
  }

  function computeTileRange() {
    if (currentLayer !== 4 || selectedTiles.length < 3) return null;
    let startIndex = 0;
    const muls = [200000, 2000, 20];
    selectedTiles.forEach((t, i) => {
      startIndex += t * muls[i];
    });
    const rangeStart = startIndex + 1;
    const rangeEnd = startIndex + 20;
    return `${rangeStart}-${rangeEnd}`;
  }

  function handleBackLayer() {
    if (currentLayer > 1) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((p) => p.slice(0, -1));
        setCurrentLayer((p) => p - 1);
        setTransitioning(false);
      }, 400);
    }
  }

  function renderTileIcon(idx: number) {
    if (currentLayer !== 4) return null;
    const rng = computeTileRange();
    if (!rng) return null;
    const [startStr] = rng.split("-");
    const startNum = parseInt(startStr, 10);
    const tilePos = String(startNum + idx);
    const st = tileStates[tilePos];
    if (!st) return null;
    if (st === "diamond") return <img src="/diamond.gif" alt="diamond" className="tile-overlay-gif" />;
    if (st === "bomb") return <img src="/nuke.gif" alt="bomb" className="tile-overlay-gif" />;
    if (st === "empty") return <img src="/hammer.gif" alt="hammer" className="tile-overlay-gif" />;
    return null;
  }

  // ---- Transactions feed
  const filteredTx = showMyBotsTxOnly
    ? transactions.filter((tx) => {
        if (!tx.data?.length) return false;
        const botAddr = (tx.data[0] || "").toLowerCase();
        return myBots.some((b) => b.toLowerCase() === botAddr);
      })
    : transactions;

  return (
    <div className="app-container">
      {/* Stats row */}
      <StatsRow stats={stats} />

      {/* Deployment Overlay */}
      {deploying && (
        <DeployingOverlay
          open={deploying}
          message={deployMessage}
          onClose={() => setDeploying(false)}
        />
      )}

      {/* Error popup (retro style) */}
      {deployError && (
        <Popup
          isOpen={true}
          title="Error"
          onClose={() => setDeployError(null)}
        >
          <p style={{ color: "red" }}>{deployError}</p>
        </Popup>
      )}

      <div className="main-content">
        {/* Left: My Bots */}
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

          {/* Leaderboard */}
          <hr style={{ margin: "1rem 0", borderColor: "#999" }} />
          <h3 className="sidebar-title">Leaderboard</h3>
          <ul style={{ marginTop: "0.5rem", maxHeight: "180px", overflowY: "auto" }}>
            {leaderboard.map((p: any, i: number) => (
              <li key={i}>
                {i+1}. {p._id?.slice(0,10)}... = {p.total_score} pts
              </li>
            ))}
          </ul>
        </Card>

        {/* Center: Grid layers */}
        <div className={`grid-section ${transitioning ? "fade-out" : "fade-in"}`}>
          {currentLayer > 1 && (
            <Button onClick={handleBackLayer}>← Back to Layer {currentLayer - 1}</Button>
          )}
          <div
            className="grid-container"
            style={{
              gridTemplateColumns: currentLayer === 4 ? "repeat(4, 0.5fr)" : "repeat(10, 0.5fr)",
            }}
          >
            {Array(currentLayer === 4 ? 20 : 100).fill(0).map((_, idx) => (
              <div
                key={idx}
                className="tile"
                style={{
                  width: currentLayer === 4 ? 110 : 44,
                  height: currentLayer === 4 ? 95 : 44,
                  border: "2px dashed black",
                  backgroundImage: `url("/tile_${currentLayer}.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
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
              Layer {currentLayer}, tile {hoveredTile+1} → {computeTileRange() || ""}
            </div>
          )}
        </div>

        {/* Right: Transaction feed */}
        <Card className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 className="sidebar-title" style={{ marginBottom: 0 }}>
              Transactions ({filteredTx.length})
            </h3>
            <Button
              bg={showMyBotsTxOnly ? "#c381b5" : "#e5e5e5"}
              textColor={showMyBotsTxOnly ? "#fff" : "#000"}
              borderColor="#000"
              shadow="#fff"
              style={{ fontSize: "0.8rem" }}
              onClick={() => {
                setFilterLoad(true);
                setTimeout(() => {
                  setShowMyBotsTxOnly(!showMyBotsTxOnly);
                  setFilterLoad(false);
                }, 200);
              }}
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
          <ul style={{ marginTop: "1rem", maxHeight: "300px", overflowY: "auto" }}>
            {filteredTx.map((tx, i) => {
              const botAddr = (tx.data[0] || "").slice(0, 10);
              let line = tx.event_name + " ~ Bot " + botAddr;
              if (tx.event_name === "TileMined") line += " (+10)";
              if (tx.event_name === "DiamondFound") line += " (+5000)";
              return <li key={i} style={{ marginBottom: "0.3rem" }}>{line}</li>;
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// Stats row with GIF icons
function StatsRow({ stats }: { stats: any }) {
  const icons: Record<string, string> = {
    totalPlayers: "/mario.gif",
    deployedBots: "/hammer.gif",
    botsAlive: "/heart.gif",
    botsDead: "/skull.gif",
    diamondsMined: "/diamond.gif",
    totalTilesMined: "/mining.gif",
  };

  const statKeys = Object.keys(stats);

  return (
    <div className="stats-container">
      {statKeys.map((key) => {
        const label = key.replace(/([A-Z])/g, " $1").trim();
        const value = stats[key];
        const icon = icons[key] || "";
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
        );
      })}
    </div>
  );
}
