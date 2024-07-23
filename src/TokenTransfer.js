// src/TokenTransfer.js
import React, { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SendTransactionError
} from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction} from '@solana/spl-token';



const TokenTransfer = () => {
  const [amount, setAmount] = useState('');
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [depositStatus, setDepositStatus] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [currentSlot, setCurrentSlot] = useState(null);

  // Fixed recipient address
  const fixedRecipientAddress = new PublicKey('2PJEwHZEEJWiXwWyk7hbQDY3tGyWtdrymAqKJhkWupF1');

  const solana = new Connection("https://solemn-boldest-firefly.solana-mainnet.quiknode.pro/121d45fc4c2e2c713f8c2f2b0559d3324fe12a1e/");

  const getTokenBalance = async (publicKey, tokenMintAddress) => {
    const tokenAccount = await getAssociatedTokenAddress(tokenMintAddress, publicKey);
    const balance = await solana.getTokenAccountBalance(tokenAccount);
    return balance.value.uiAmount;
  };

  useEffect(() => {
    const fetchCurrentSlot = async () => {
      try {
        const slot = await solana.getSlot();
        setCurrentSlot(slot);
        console.log("Current Slot:", slot);
      } catch (error) {
        console.error("Error fetching current slot:", error);
      };
    };

    fetchCurrentSlot();
  }, [publicKey]);

    const connectWallet = async () => {
      if (!window.solana || !window.solana.isPhantom) {
        setTransactionStatus('Phantom wallet is not installed!');
        return;
      }
      try {
        const resp = await window.solana.connect();
        setPublicKey(resp.publicKey);
      } catch (err) {
        console.error("Error connecting to wallet: ", err);
        setTransactionStatus(`Error: ${err.message}`);
      }
    };
  
  const recordDepositOnBackend = async (walletAddress, amount) => {
    try {
      const response = await fetch('http://localhost:5000/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: amount,
          status: 'completed', // Assuming the transaction is completed when we record it
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record deposit');
      }

      const data = await response.json();
      setDepositStatus(`Deposit recorded. Total deposited: ${data.total_deposited}`);
    } catch (error) {
      setDepositStatus(`Error recording deposit: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!publicKey) {
      setTransactionStatus('Please connect your wallet first.');
      return;
    }
    
    // Replace with actual token mint address
    const tokenMintAddress = new PublicKey('GMWhFAjvmkEkSoU8MepbbeTdWhSZJr3nTY3VM3SATd91');


    try {
      // Check if Phantom is connected
      if (!window.solana.isConnected) {
        throw new Error("Phantom wallet is not connected");
      }
    
      const senderTokenAccountPubkey = await getAssociatedTokenAddress(
        tokenMintAddress,
        publicKey
      );
    
      const recipientTokenAccountPubkey = await getAssociatedTokenAddress(
        tokenMintAddress,
        fixedRecipientAddress
      );
    
      // Check if sender's token account exists
    let transaction = new Transaction();
    
    
    const senderAccountInfo = await solana.getAccountInfo(senderTokenAccountPubkey)

    // If sender's token account doesn't exist, create it
    if (!senderAccountInfo) {
      console.log("Creating sender's token account");
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        publicKey, // payer
        senderTokenAccountPubkey,
        publicKey, // owner
        tokenMintAddress
      );
      transaction.add(createAccountInstruction);
    }

    // Check if recipient's token account exists, if not, you might want to create it
    const recipientAccountInfo = await solana.getAccountInfo(recipientTokenAccountPubkey);
    if (!recipientAccountInfo) {
      console.log("Creating recipient's token account");
      const createRecipientAccountInstruction = createAssociatedTokenAccountInstruction(
        publicKey, // payer
        recipientTokenAccountPubkey,
        fixedRecipientAddress, // owner
        tokenMintAddress
      );
      transaction.add(createRecipientAccountInstruction);
    }

    const transferInstruction = createTransferInstruction(
      senderTokenAccountPubkey,
      recipientTokenAccountPubkey,
      publicKey,
      parseInt(amount)
    );

    transaction.add(transferInstruction);

    // Fetch a recent blockhash right before sending the transaction
    const { blockhash, lastValidBlockHeight } = await solana.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Request the wallet to sign and send the transaction
    const signedTransaction = await window.solana.signTransaction(transaction);
    const signature = await solana.sendRawTransaction(signedTransaction.serialize());

    console.log("Transaction sent with signature:", signature)

    // Wait for confirmation with a timeout
    const confirmation = await solana.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    setTransactionStatus(`Transaction successful with signature: ${signature}`);
    
    // Record the deposit on the backend
    await recordDepositOnBackend(publicKey.toString(), amount);
  } catch (error) {
    console.error("Detailed error:", error);
    if (error instanceof SendTransactionError) {
      console.error("SendTransactionError details:", error.logs);
      setTransactionStatus(`Transaction failed: ${error.message}. Please check your token balance.`);
    } else {
      setTransactionStatus(`Error during token transfer: ${error.message}`);
    }
    
  }
};


  

  return (
    <div>
      <h1>Transfer SPL Token</h1>
      {publicKey ? (
        <p>Connected: {publicKey.toString()}</p>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Amount:
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit">Transfer</button>
      </form>
      {transactionStatus && <p>{transactionStatus}</p>}
      {depositStatus && <p>{depositStatus}</p>}
    </div>
  );
};

export default TokenTransfer;