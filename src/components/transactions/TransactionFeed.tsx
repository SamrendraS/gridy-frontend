import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { num } from "starknet"

export interface TransactionItem {
  id: string
  transaction_hash: string
  eventName: string
  data?: string[]
  timestamp?: string
  blockNumber?: string | number
  status?: string
}

interface Props {
  transactions: TransactionItem[]
}

export default function TransactionFeed({ transactions }: Props) {
  const shortHash = (hash: string) => {
    return hash.slice(0, 10) + "..." + hash.slice(-4)
  }

  return (
    <div style={{ 
      marginTop: "0.5rem", 
      maxHeight: "300px", 
      overflowY: "auto", 
      display: "flex", 
      flexDirection: "column" 
    }}>
      <AnimatePresence initial={false}>
        {transactions.map((tx) => {
          const { bot_address, player, location } = tx.data;
          // const shortHash = tx.transaction_hash
          //   ? tx.transaction_hash.slice(0, 10) + "..." + tx.transaction_hash.slice(-4)
          //   : "(no-hash)"
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                background: "#fff",
                color: "#000",
                marginBottom: "0.4rem",
                padding: "0.5rem",
                border: "1px solid #444",
                borderRadius: "4px",
                boxShadow: "2px 2px 0 #000",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{tx.eventName}</div>
              <div style={{ fontSize: "0.85rem" }}>txHash: {shortHash(tx.transaction_hash)}</div>
              <div style={{ fontSize: "0.85rem" }}>bot: {shortHash(num.toHex(bot_address))}</div>
              {player && <div style={{ fontSize: "0.85rem" }}>player: {shortHash(num.toHex(player))}</div>}
              {location && <div style={{ fontSize: "0.85rem" }}>location: {location}</div>}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
