"use client"
import React, { useEffect, useState } from "react"
import { Card } from "pixel-retroui"

type MiniGameOverlayProps = {
  open: boolean
  message: string
  onClose: () => void
}

export default function MiniGameOverlay({
  open,
  message,
  onClose
}: MiniGameOverlayProps) {
  const [starsClicked, setStarsClicked] = useState(0)
  const [target] = useState(3)

  useEffect(() => {
    if (!open) setStarsClicked(0)
  }, [open])

  useEffect(() => {
    if (starsClicked >= target) {
      setTimeout(() => onClose(), 500)
    }
  }, [starsClicked, target, onClose])

  if (!open) return null

  const handleStarClick = () => {
    setStarsClicked((prev) => prev + 1)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Card
        bg="#fefcd0"
        textColor="#000"
        borderColor="#000"
        shadowColor="#c381b5"
        className="p-4 flex flex-col items-center relative"
      >
        <h2 className="text-lg mb-2">Awaiting Confirmation</h2>
        <p style={{ marginBottom: "1rem", maxWidth: "220px", textAlign: "center" }}>
          {message}
        </p>
        <p style={{ fontSize: "0.8rem", color: "#555" }}>
          Collect {target} stars to confirm bridging:
        </p>
        <p style={{ fontWeight: "bold", fontSize: "1.2rem", marginBottom: "1rem" }}>
          {starsClicked} / {target}
        </p>

        <div style={{ display: "flex", gap: "1rem" }}>
          {[...Array(target)].map((_, i) => (
            <img
              key={i}
              src="/star.gif"
              alt="star"
              style={{ width: "40px", cursor: "pointer" }}
              onClick={handleStarClick}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "1rem",
            border: "1px solid #000",
            backgroundColor: "#c381b5",
            color: "white",
            cursor: "pointer",
            padding: "4px 8px"
          }}
        >
          Cancel
        </button>
      </Card>
    </div>
  )
}
