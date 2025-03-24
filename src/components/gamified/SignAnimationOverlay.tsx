"use client";
import React, { useEffect, useState } from "react";
import { Card } from "pixel-retroui";

type SignAnimationOverlayProps = {
  open: boolean;
  message?: string;
  onClose: () => void;
};

export default function SignAnimationOverlay({
  open,
  message,
  onClose,
}: SignAnimationOverlayProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!open) return;
    let f = 0;
    const intv = setInterval(() => {
      f = (f + 1) % 6;
      setFrame(f);
    }, 200);
    return () => clearInterval(intv);
  }, [open]);

  if (!open) return null;

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
        textColor="#000"
        borderColor="#000"
        shadowColor="#000"
        className="p-4 flex flex-col items-center"
      >
        <h2 className="font-minecraft-bold text-lg mb-2">Signing Transaction</h2>
        <p className="text-sm mb-4">{message || "Please confirm in your wallet."}</p>
        <img
          src={`/sign_anim_${frame}.png`}
          alt="Signing animation"
          className="w-24 h-24"
        />
        <button
          onClick={onClose}
          style={{
            marginTop: "1rem",
            border: "1px solid black",
            backgroundColor: "#444",
            color: "#fff",
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </Card>
    </div>
  );
}
