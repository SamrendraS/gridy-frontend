"use client";
import React, { useEffect, useState, useRef } from "react";
import { Button, Card, Popup } from "pixel-retroui";
import { useAccount as useStarknetAccount } from "@starknet-react/core";
import { useAccount as useWagmiAccount } from "wagmi";
import { Account } from "starknet";

import L1Connector from "./connectors/L1Connector";
import WalletConnector from "./WalletConnector"; // L2 starknet connector

import { deployBotFromL1 } from "./connectors/L1Bridge";
import { deployBotFromL2 } from "./connectors/L2Bridge";
import { checkL1Balance, checkL2Balance } from "./utils/balanceChecks";

import {
  L1_TOKEN_ADDRESS,
  L2_TOKEN_ADDRESS,
  REQUIRED_BOT_DEPLOY_AMOUNT,
} from "./config/constants";

import RetroLoadingOverlay from "./components/RetroLoadingOverlay";
import "./styles.css";

/**
 * MainGame: The primary "Gridy" game with layering and bridging on tile click
 */
const MainGame: React.FC = () => {
  // ------------------------------
  // 1) WebSocket references & Data
  // ------------------------------
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    deployedBots: 0,
    botsAlive: 0,
    diamondsMined: 0,
    botsDead: 0,
    totalTilesMined: 0,
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const transactionWSRef = useRef<WebSocket | null>(null);
  const statsWSRef = useRef<WebSocket | null>(null);
  const tilesWSRef = useRef<WebSocket | null>(null);

  // ------------------------------
  // 2) Game & Layering State
  // ------------------------------
  const [currentLayer, setCurrentLayer] = useState(1);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [tileStates, setTileStates] = useState<Record<string, string>>({});
  const [transitioning, setTransitioning] = useState(false);

  // ------------------------------
  // 3) Wallet States & bridging UI
  // ------------------------------
  // L2 starknet
  const { account: starknetAccount } = useStarknetAccount();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [walletAccount, setWalletAccount] = useState<Account | null>(null);

  // L1 wagmi
  const { address: l1Address, isConnected: isL1Connected } = useWagmiAccount();

  // Loading states for bridging
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);

  // If user attempts to deploy a bot with no wallet
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // ------------------------------
  // 4) UseEffects: WebSocket Setup
  // ------------------------------
  useEffect(() => {
    transactionWSRef.current = new WebSocket(import.meta.env.VITE_WS_TRANSACTION_URL);
    transactionWSRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transactions") {
        setTransactions((prev) => {
          const updated = [...data.data, ...prev];
          return updated.slice(0, 30); // keep most recent 30
        });
      }
    };

    statsWSRef.current = new WebSocket(import.meta.env.VITE_WS_STATS_URL);
    statsWSRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "stats") {
        setStats({
          totalPlayers: data.data.totalPlayers,
          deployedBots: data.data.totalBots,
          botsAlive: data.data.botsAlive,
          botsDead: data.data.botsDead,
          diamondsMined: data.data.diamondsMined,
          totalTilesMined: data.data.totalTilesMined ?? 0,
        });
        setLeaderboard(data.data.leaderboard);
      }
    };

    tilesWSRef.current = new WebSocket(import.meta.env.VITE_WS_TILES_URL);

    return () => {
      transactionWSRef.current?.close();
      statsWSRef.current?.close();
      tilesWSRef.current?.close();
    };
  }, []);

  // ------------------------------
  // 5) Tiles WebSocket: handle tileData
  // ------------------------------
  useEffect(() => {
    if (!tilesWSRef.current) return;

    const hexToDecimal = (hex: string): string => {
      if (hex.startsWith("0x")) {
        return parseInt(hex, 16).toString();
      }
      return hex;
    };

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "tileData") {
        const newTileStates: Record<string, string> = { ...tileStates };
        data.data.forEach((tile: any) => {
          const decimalLoc = hexToDecimal(tile.location);
          newTileStates[decimalLoc] = tile.mine_type.toLowerCase();
        });
        setTileStates(newTileStates);
      }
    };

    tilesWSRef.current.onmessage = handleMessage;
    return () => {
      if (tilesWSRef.current) {
        tilesWSRef.current.onmessage = null;
      }
    };
  }, [tileStates]);

  // Request tile data when we enter Layer 4
  useEffect(() => {
    if (currentLayer === 4 && tilesWSRef.current?.readyState === WebSocket.OPEN) {
      const tileRange = calculateTileRangeForCurrentView();
      if (tileRange) {
        tilesWSRef.current.send(
          JSON.stringify({
            action: "viewTiles",
            layer: currentLayer,
            tileRange: tileRange,
          })
        );
      }
    }
  }, [currentLayer, selectedTiles]);

  // ------------------------------
  // 6) Helper: Range for layer 4
  // ------------------------------
  const calculateTileRangeForCurrentView = () => {
    if (currentLayer !== 4 || selectedTiles.length < 3) return null;
    let startIndex = 0;
    selectedTiles.forEach((tile, i) => {
      const multiplier = [200000, 2000, 20][i]; // example from your code
      startIndex += tile * multiplier;
    });
    const rangeStart = startIndex + 1;
    const rangeEnd = startIndex + 20; // 20 tiles in layer 4
    return `${rangeStart}-${rangeEnd}`;
  };

  // For hovered tile
  const calculateTileRange = () => {
    if (hoveredTile === null) return null;
    const baseRange = [200000, 2000, 20, 1][currentLayer - 1];
    let startIndex = 0;
    if (selectedTiles.length > 0) {
      selectedTiles.forEach((tile, i) => {
        const multiplier = [200000, 2000, 20, 1][i];
        startIndex += tile * multiplier;
      });
    }
    const rangeStart = startIndex + hoveredTile * baseRange + 1;
    const rangeEnd = rangeStart + baseRange - 1;
    return `${rangeStart}-${rangeEnd}`;
  };

  // ------------------------------
  // 7) Tile Click Navigation
  // ------------------------------
  const handleTileClick = (index: number) => {
    if (currentLayer < 4) {
      // "zoom in" to next layer
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((prev) => [...prev, index]);
        setCurrentLayer((prev) => prev + 1);
        setTransitioning(false);
      }, 500);
    } else if (currentLayer === 4) {
      // Deploy a bot here
      const tileRange = calculateTileRangeForCurrentView();
      if (!tileRange) return;
      const tilePosition = Number(tileRange.split("-")[0]) + index;
      const tileLocation = tilePosition.toString();

      // If tile is already mined
      if (tileStates[tileLocation] && tileStates[tileLocation] !== "unmined") {
        alert("This tile has already been mined!");
        return;
      }

      handleDeployBot(tileLocation);
    }
  };

  // "Back" button
  const handleBack = () => {
    if (currentLayer > 1) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((prev) => prev.slice(0, -1));
        setCurrentLayer((prev) => prev - 1);
        setTransitioning(false);
      }, 500);
    }
  };

  // ------------------------------
  // 8) Deploy Bot Logic (Tile Click)
  // ------------------------------
  async function handleDeployBot(tileLocation: string) {
    setDeployError(null);
    setDeployTxHash(null);

    // Are we on L2 or L1?
    if (!walletAccount && !isL1Connected) {
      // No wallet
      setShowErrorPopup(true);
      return;
    }

    setIsDeploying(true);
    try {
      if (walletAccount) {
        // L2 route
        await checkL2Balance(walletAccount, L2_TOKEN_ADDRESS, REQUIRED_BOT_DEPLOY_AMOUNT);
        const txHash = await deployBotFromL2(walletAccount, walletAccount.address, tileLocation);
        setDeployTxHash(txHash);
        alert(`Bot deployed to tile ${tileLocation} from L2. TX: ${txHash}`);
      } else if (isL1Connected && l1Address) {
        // L1 route
        await checkL1Balance(l1Address, L1_TOKEN_ADDRESS, REQUIRED_BOT_DEPLOY_AMOUNT);
        const tileLocBig = BigInt(tileLocation);
        const depositHash = await deployBotFromL1(
          l1Address as `0x${string}`,
          REQUIRED_BOT_DEPLOY_AMOUNT,
          tileLocBig
        );
        setDeployTxHash(depositHash);
        alert(`Bot deployed to tile ${tileLocation} from L1. TX: ${depositHash}`);
      }
    } catch (err: any) {
      console.error("Deploy error:", err);
      setDeployError(err.message || String(err));
    } finally {
      setIsDeploying(false);
    }
  }

  // Called when L2 wallet is connected
  const handleWalletConnect = (newAddress: string, provider: string) => {
    setWalletAddress(newAddress);
    setWalletProvider(provider);
    setWalletAccount(window.starknet?.account || starknetAccount || null);
  };
  // Called when L2 wallet is disconnected
  const handleWalletDisconnect = () => {
    setWalletAddress(null);
    setWalletProvider(null);
    setWalletAccount(null);
  };

  // ------------------------------
  // 9) Stat Cards & Leaderboard
  // ------------------------------
  const getGifForStat = (statKey: string): string => {
    switch (statKey) {
      case "totalPlayers":
        return "/mario.gif";
      case "deployedBots":
        return "/hammer.gif";
      case "botsAlive":
        return "/heart.gif";
      case "botsDead":
        return "/skull.gif";
      case "diamondsMined":
        return "/diamond.gif";
      case "totalTilesMined":
        return "/mining.gif";
      default:
        return "";
    }
  };

  const renderStatCard = (label: string, value: number) => {
    const formattedLabel = label.replace(/([A-Z])/g, " $1").trim();
    const gifSrc = getGifForStat(label);
    return (
      <Card key={label} className="stats-card">
        <div className="stats-container">
          <div className="gif-container">
            <img src={gifSrc} alt={formattedLabel} className="stat-gif" />
          </div>
          <div>
            <span className="stats-label">{formattedLabel}</span>
            <div className="stats-value">{value}</div>
          </div>
        </div>
      </Card>
    );
  };

  // ------------------------------
  // 10) Grid & Render
  // ------------------------------
  // For layer <4, NxN grid; for layer=4, 20 tiles
  const effectiveSize = currentLayer === 4 ? 4 : 10;
  const tiles = Array(currentLayer === 4 ? 20 : effectiveSize * effectiveSize).fill(null);
  const tileSizeWidth = currentLayer === 4 ? 110 : 43;
  const tileSizeHeight = currentLayer === 4 ? 95 : 43;

  const eventColors: { [key: string]: string } = {
    BombFound: "#FF4C4C",
    TileAlreadyMined: "#E6B800",
    DiamondFound: "#4CAF50",
    TileMined: "#2196F3",
  };

  // For layer=4, show overlays?
  const renderTileContent = (index: number) => {
    if (currentLayer !== 4) return null;
    const tileRange = calculateTileRangeForCurrentView();
    if (!tileRange) return null;
    const tilePosition = Number(tileRange.split("-")[0]) + index;
    const tileLocation = tilePosition.toString();
    const tileState = tileStates[tileLocation];
    if (tileState === "diamond") {
      return <img src="/diamond.gif" alt="diamond" className="tile-overlay-gif" />;
    } else if (tileState === "bomb") {
      return <img src="/nuke.gif" alt="nuke" className="tile-overlay-gif" />;
    } else if (tileState === "empty") {
      return <img src="/hammer.gif" alt="hammer" className="tile-overlay-gif" />;
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* ------ Header ------ */}
      <div className="header">
        <h1 style={{ marginLeft: "0.5rem" }}>Gridy</h1>
        <div className="header-buttons" style={{ marginRight: "0.5rem" }}>
          {/* 1) L1 Connect (EVM) */}
          <L1Connector />
          {/* 2) L2 Connect (Starknet) */}
          <WalletConnector
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
            isConnected={!!walletAddress}
            connectedAddress={walletAddress || undefined}
            connectedProvider={walletProvider || undefined}
          />
        </div>
      </div>

      {/* If bridging in progress -> RetroLoadingOverlay */}
      {isDeploying && (
        <RetroLoadingOverlay
          message="Deploying your bot..."
          progress={75}
        />
      )}

      {/* If user tries to deploy without a wallet */}
      {showErrorPopup && (
        <Popup
          title="Wallet Not Connected"
          onClose={() => setShowErrorPopup(false)}
          isOpen={showErrorPopup}
        >
          <p style={{ color: "red" }}>
            ⚠️ Please connect either an L1 or L2 wallet before deploying a bot.
          </p>
        </Popup>
      )}

      {/* If bridging error occurs */}
      {deployError && (
        <Popup
          title="Deployment Error"
          onClose={() => setDeployError(null)}
          isOpen={!!deployError}
        >
          <p style={{ color: "red" }}>{deployError}</p>
        </Popup>
      )}

      {/* Stats row */}
      <div className="stats-container">
        {Object.entries(stats).map(([label, value]) =>
          renderStatCard(label, value as number)
        )}
      </div>

      {/* Main content: Left sidebar, Grid, Right sidebar */}
      <div className="main-content">
        {/* Left: Transactions */}
        <Card className="sidebar">
          <h3 className="sidebar-title">Transactions</h3>
          <ul className="transaction-list">
            {transactions.map((tx, index) => {
              const botAddr = tx.data[0]
                ? `${tx.data[0].slice(0, 6)}...${tx.data[0].slice(-4)}`
                : "Unknown";
              let message = `${tx.event_name} - ${botAddr}`;
              if (tx.event_name === "TileMined") message += " - 10 pts";
              else if (tx.event_name === "DiamondFound") message += " - 5000 pts";
              return (
                <li
                  key={index}
                  style={{ color: eventColors[tx.event_name] || "#FFF" }}
                >
                  {message}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Center grid */}
        <div className={`grid-section ${transitioning ? "fade-out" : "fade-in"}`}>
          {currentLayer > 1 && (
            <Button onClick={handleBack}>← Back to Layer {currentLayer - 1}</Button>
          )}

          <div
            className="grid-container"
            style={{
              gridTemplateColumns: `repeat(${effectiveSize}, 0.5fr)`,
            }}
          >
            {tiles.map((_, index) => (
              <div
                key={index}
                className="tile"
                style={{
                  backgroundImage: `url('/tile_${currentLayer}.png')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  height: tileSizeHeight,
                  width: tileSizeWidth,
                  border: "3px dashed black",
                  position: "relative",
                }}
                onMouseEnter={() => setHoveredTile(index)}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => handleTileClick(index)}
              >
                {renderTileContent(index)}
              </div>
            ))}
          </div>

          <div className="hover-info">
            {hoveredTile !== null && (
              <>
                Layer {currentLayer} . {tiles.length} tiles . Tile{" "}
                {hoveredTile + 1} → ({calculateTileRange()})
              </>
            )}
          </div>
        </div>

        {/* Right: Leaderboard */}
        <Card className="sidebar">
          <h3 className="sidebar-title">Leaderboard</h3>
          <ul className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <li key={index}>
                {index + 1}. {player.total_score} pts -{" "}
                {player._id.slice(0, 14)}...{player._id.slice(-14)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default MainGame;
