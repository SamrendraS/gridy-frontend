import React, { useState } from 'react';
import { Button, Card, Popup } from 'pixel-retroui';
import { approveBridge, depositTokensWithMessage } from './L1Bridge';
import { useAccount } from 'wagmi';
import { waitForTransaction } from 'wagmi/actions';

export default function L1BridgeUI() {
  const { address: l1Address, isConnected } = useAccount();

  const [amount, setAmount] = useState<string>('1000000000000000'); // 1e15
  const [tileLocation, setTileLocation] = useState<string>('1');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  /**
   * Track if the user has successfully approved the bridge.
   * If false, "Deposit" button is disabled.
   */
  const [isApproved, setIsApproved] = useState(false);

  const handleApprove = async () => {
    if (!isConnected) {
      alert('Please connect an L1 wallet first.');
      return;
    }

    try {
      setIsApproving(true);
      setIsApproved(false);

      // 1) Send "approve" transaction
      const hash = await approveBridge(BigInt(amount));
      setTxHash(hash);

      alert(`Approval TX sent: ${hash}\nWaiting for confirmation...`);

      // 2) Wait for transaction to confirm on-chain
      const receipt = await waitForTransaction({
        hash,
        // Optional: specify chainId if needed
        // chainId: sepolia.id,
      });

      // If we got a receipt without throwing, the tx is confirmed
      setIsApproved(true);
      alert('Approval confirmed on-chain! You can now deposit.');

    } catch (err: any) {
      alert(`Approve error: ${err?.message ?? err}`);
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !l1Address) {
      alert('Please connect an L1 wallet first.');
      return;
    }
    if (!isApproved) {
      alert('Please wait until the approval transaction is confirmed before depositing.');
      return;
    }

    try {
      setIsDepositing(true);

      // 1) deposit_with_message
      const depositHash = await depositTokensWithMessage(
        l1Address,
        BigInt(amount),
        BigInt(tileLocation),
      );
      setTxHash(depositHash);

      alert(`Deposit TX sent: ${depositHash}\nWaiting for network confirmation...`);

      // 2) You can optionally wait for deposit tx confirmation too:
      const receipt = await waitForTransaction({
        hash: depositHash,
      });
      alert('Deposit confirmed on-chain!');

    } catch (err: any) {
      alert(`Deposit error: ${err?.message ?? err}`);
      console.error(err);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div>
      <Button
        bg="#ffffff"
        textColor="#000000"
        borderColor="#000000"
        shadow="#ffffff"
        onClick={() => setShowPopup(true)}
      >
        Bridge L1→L3
      </Button>

      {showPopup && (
        <Popup
          title="Bridge Tokens to L3"
          onClose={() => setShowPopup(false)}
          isOpen={showPopup}
        >
          <Card style={{ padding: '1rem', backgroundColor: '#fff', color: '#000' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              <b>Amount (wei):</b>
              <input
                type="text"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              <b>Tile Location (message):</b>
              <input
                type="text"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={tileLocation}
                onChange={(e) => setTileLocation(e.target.value)}
              />
            </label>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                bg="#e5e5e5"
                textColor="#000000"
                borderColor="#000000"
                shadow="#ffffff"
              >
                {isApproving ? 'Approving...' : isApproved ? 'Approved ✔' : 'Approve'}
              </Button>

              <Button
                onClick={handleDeposit}
                disabled={!isApproved || isDepositing}
                bg="#4CAF50"
                textColor="#ffffff"
                borderColor="#000000"
                shadow="#ffffff"
              >
                {isDepositing ? 'Depositing...' : 'Deposit'}
              </Button>
            </div>

            {txHash && (
              <p style={{ marginTop: '1rem', color: '#333' }}>
                Latest TX Hash: {txHash}
              </p>
            )}
          </Card>
        </Popup>
      )}
    </div>
  );
}
