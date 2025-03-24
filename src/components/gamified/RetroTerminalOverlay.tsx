"use client";
import React, { useState, useEffect } from "react";
import { Card } from "pixel-retroui";

type RetroTerminalOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export default function RetroTerminalOverlay({
  open,
  onClose
}: RetroTerminalOverlayProps) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setLines([]);
      return;
    }
    const initial = [
      "C:\\> Deploying Bot to remote host...",
      "C:\\> Checking resources...",
      "C:\\> Please press ENTER to sign transaction..."
    ];
    setLines(initial);
  }, [open]);

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      // They "confirmed"
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      <Card
        bg="#000"
        textColor="#0f0"
        borderColor="#0f0"
        shadowColor="#000"
        className="p-4 w-96 h-64 overflow-auto"
        style={{ fontFamily: "monospace" }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#bbb" }}>
          (Press ENTER or click “Cancel”)
        </div>
        <button
          onClick={() => onClose()}
          style={{
            marginTop: "1rem",
            border: "1px solid #0f0",
            backgroundColor: "#444",
            color: "#0f0",
            cursor: "pointer",
            padding: "4px 8px"
          }}
        >
          Cancel
        </button>
      </Card>
    </div>
  );
}
