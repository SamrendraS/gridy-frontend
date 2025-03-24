"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card, ProgressBar } from "pixel-retroui";

type GamifiedBridgeOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  step: number;    // 0 to 100 for bridging progress
  message: string; // e.g. "Approving tokens..." / "Bridging..."
};

export default function GamifiedBridgeOverlay({
  isOpen,
  onClose,
  step,
  message,
}: GamifiedBridgeOverlayProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!isOpen) return;
    const intv = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(intv);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <Card
        bg="#ffffff"
        textColor="#000000"
        borderColor="#000000"
        shadowColor="#000000"
        className="p-6 flex flex-col items-center max-w-md"
      >
        <h2 className="font-minecraft-bold text-lg mb-2">Bridging in Progress{dots}</h2>
        <p className="text-sm mb-4">{message}</p>
        <ProgressBar
          progress={step}
          color="#c381b5"
          borderColor="#000"
          className="w-64 mb-4"
        />
        <img
          src="/bridge_gif.gif"
          alt="bridge animation"
          className="w-32 h-32 mb-4"
        />
        <button
          style={{
            border: "1px solid black",
            padding: "4px 8px",
            cursor: "pointer",
            backgroundColor: "#c381b5",
            color: "white",
          }}
          onClick={() => onClose()}
        >
          Cancel
        </button>
      </Card>
    </div>
  );
}
