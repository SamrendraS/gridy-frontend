"use client";
import React from "react";
import { Card } from "pixel-retroui";

type DeployingOverlayProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

export default function DeployingOverlay({ open, message, onClose }: DeployingOverlayProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <Card
        bg="#ffffff"
        textColor="#000"
        borderColor="#000"
        shadowColor="#000000"
        className="p-4 flex flex-col items-center"
        style={{ minWidth: "300px" }}
      >
        <h2 className="text-lg font-minecraft-bold mb-2">Deploying Bot</h2>
        <p style={{ color: "#444", marginBottom: "1rem", textAlign: "center" }}>
          {message}
        </p>
        <img
          src="/bridge_cat.gif"
          alt="Bridging"
          style={{ width: "120px", height: "120px", marginBottom: "1rem" }}
        />
        <button
          onClick={() => onClose()}
          style={{
            border: "1px solid #000",
            backgroundColor: "#c381b5",
            color: "#fff",
            padding: "4px 12px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </Card>
    </div>
  );
}
