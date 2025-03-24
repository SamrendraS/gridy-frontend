"use client";
import React, { useEffect, useState } from "react";
import { Card, ProgressBar, Button } from "pixel-retroui";
import { fetchPlayerBots } from "../../connectors/gameConnector"; 
// This calls your get_total_bots_of_player, etc.

type DeployAdventureOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  playerAddress: string;
  tileLocation: string;     // So we can show the tile in the animation
  doL1Bridge: boolean;      // If bridging L1→L2→L3 or direct L2→L3
  pollInterval?: number;    // How frequently we poll (ms)
  contractAddress?: string; // For fetchPlayerBots if needed
  onDeployStart?: () => Promise<void>; 
  // This function triggers the bridging or signing, returns once tx is sent, but not confirmed
};

/**
 * DeployAdventureOverlay:
 *  - Multi-step 8-bit animation (like "Gathering resources", "Cross warp" etc.)
 *  - Calls `onDeployStart` to do bridging/tx sending.
 *  - Then polls the contract or waits for event to confirm the new bot has arrived.
 */
export default function DeployAdventureOverlay({
  isOpen,
  onClose,
  playerAddress,
  tileLocation,
  doL1Bridge,
  pollInterval = 4000,
  contractAddress,
  onDeployStart,
}: DeployAdventureOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [message, setMessage] = useState("");
  const [botsCountStart, setBotsCountStart] = useState<number | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(0);
    setMessage("");
    setIsDeployed(false);
    setPollError(null);
    setPollingActive(false);

    // Capture starting bot count
    if (contractAddress && playerAddress) {
      fetchPlayerBots(contractAddress, playerAddress).then((bots) => {
        setBotsCountStart(bots.length);
      });
    }
  }, [isOpen, contractAddress, playerAddress]);

  useEffect(() => {
    if (!isOpen || !botsCountStart || !pollingActive) return;

    const handlePoll = async () => {
      try {
        const bots = await fetchPlayerBots(contractAddress!, playerAddress);
        if (bots.length > botsCountStart) {
          setIsDeployed(true);
        }
      } catch (err: any) {
        setPollError(String(err.message));
      }
    };

    let intv: any;
    if (!isDeployed) {
      intv = setInterval(handlePoll, pollInterval);
    }
    return () => clearInterval(intv);
  }, [pollingActive, isDeployed, isOpen, botsCountStart, contractAddress, playerAddress, pollInterval]);

  useEffect(() => {
    if (isDeployed) {
      setMessage("Your Bot has arrived safely!");
      setTimeout(() => onClose(), 2000);
    }
  }, [isDeployed, onClose]);

  if (!isOpen) return null;

  const startDeployment = async () => {
    setCurrentStep(1);
    // Step 1: "Gathering resources..."
    setMessage("Gathering resources...");
    await new Promise((r) => setTimeout(r, 1000));

    if (onDeployStart) {
      try {
        // step 2: bridging or direct sign
        setCurrentStep(2);
        if (doL1Bridge) {
          setMessage("Crossing the Warp Bridge...");
        } else {
          setMessage("Activating Bot Blueprint...");
        }
        await onDeployStart();
      } catch (err: any) {
        setMessage("Deployment failed! " + String(err.message));
        return;
      }
    }

    // step 3: waiting for arrival
    setCurrentStep(3);
    setMessage("Awaiting Bot arrival on tile " + tileLocation + "...");
    setPollingActive(true);
  };

  const handleCancel = () => {
    onClose();
  };

  const progress = (() => {
    switch (currentStep) {
      case 0: return 0;
      case 1: return 25;
      case 2: return 60;
      case 3: return 90;
      default: return 100;
    }
  })();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <Card
        bg="#fefcd0"
        textColor="#000"
        borderColor="#000"
        shadowColor="#c381b5"
        className="p-6 max-w-md flex flex-col items-center"
      >
        <h2 className="font-minecraft-bold text-lg mb-2">
          Bot Deployment Adventure
        </h2>
        <p className="mb-4" style={{ textAlign: "center" }}>
          {message}
        </p>
        <ProgressBar
          color="#c381b5"
          borderColor="#000"
          progress={progress}
          className="w-64 mb-4"
        />

        {/* Pixel-art animation changes per step */}
        {currentStep === 0 && (
          <img src="/step0_gather.gif" alt="Gather" className="w-32 h-32" />
        )}
        {currentStep === 1 && (
          <img src="/step1_resources.gif" alt="Resources" className="w-32 h-32" />
        )}
        {currentStep === 2 && doL1Bridge && (
          <img src="/step2_bridge.gif" alt="Bridging" className="w-32 h-32" />
        )}
        {currentStep === 2 && !doL1Bridge && (
          <img src="/step2_sign.gif" alt="Signing" className="w-32 h-32" />
        )}
        {currentStep === 3 && (
          <img src="/step3_wait.gif" alt="Awaiting" className="w-32 h-32" />
        )}
        {pollError && (
          <div className="mt-2 text-red-600 text-sm">{pollError}</div>
        )}

        {!currentStep && (
          <Button
            onClick={startDeployment}
            bg="#c381b5"
            textColor="#fefcd0"
            borderColor="#000"
            shadow="#000"
            className="mt-4"
          >
            Start Deployment
          </Button>
        )}

        <Button
          onClick={handleCancel}
          bg="#e5e5e5"
          textColor="#000"
          borderColor="#000"
          shadow="#fff"
          className="mt-4"
        >
          Cancel
        </Button>
      </Card>
    </div>
  );
}
