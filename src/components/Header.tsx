import React from "react"
import "../styles.css"
import L1Connector from "../connectors/L1Connector"
import L2Connector from "../connectors/L2Connector"

export default function Header() {
  return (
    <header className="header">
      <h1>GRIDY</h1>
      <div className="header-buttons">
        <L1Connector />
        <L2Connector />
      </div>
    </header>
  )
}
