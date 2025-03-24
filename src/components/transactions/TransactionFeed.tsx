// src/components/transactions/TransactionFeed.tsx

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface TransactionItem {
  id: string;              // unique ID
  transaction_hash: string;
  eventName: string;
  data?: string[];
  timestamp?: string;
  blockNumber?: string | number;
  status?: string;
}

/** 
 * TransactionFeed:
 * - Renders a list of transaction "cards" with a simple slide-in animation.
 * - Expects "transactions" to already be in the desired order (newest first).
 */
interface Props {
  transactions: TransactionItem[];
}
export default function TransactionFeed({ transactions }: Props) {
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
          // Shorten hash
          const shortHash = tx.transaction_hash
            ? tx.transaction_hash.slice(0, 10) + "..." + tx.transaction_hash.slice(-4)
            : "(no-hash)";

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
              <div style={{ fontSize: "0.85rem" }}>{shortHash}</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
