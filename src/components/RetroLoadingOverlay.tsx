"use client"
import React from "react"
import { Card, ProgressBar } from "pixel-retroui"

type RetroLoadingOverlayProps = {
  message?: string
  progress?: number
}

export default function RetroLoadingOverlay({
  message,
  progress = 80,
}: RetroLoadingOverlayProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
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
        className="p-6 flex flex-col items-center"
      >
        <h2 className="text-lg mb-4">
          {message || "Loading..."}
        </h2>
        <ProgressBar
          progress={progress}
          color="#c381b5"
          borderColor="#000"
          className="w-64"
        />
      </Card>
    </div>
  )
}
