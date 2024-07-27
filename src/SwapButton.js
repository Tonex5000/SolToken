import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { createTransferInstruction, createMintToInstruction, getAccount, getMint } from '@solana/spl-token';
import { HOME_TOKEN_ACCOUNT, LP_TOKEN_MINT, RECEIVER_ACCOUNT } from './config';

function SwapButton() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState('');

  const handleSwap = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }
  
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount to swap.');
      return;
    }
  
    const tokenAmount = Math.floor(Number(amount) * (10 ** 9)); // Assuming 9 decimals
  
    try {
      console.log('Starting swap process...');
  
      // Get the user's token account info
      console.log('Fetching user account...');
      const userAccount = await getAccount(connection, new PublicKey(HOME_TOKEN_ACCOUNT));
      console.log('User account fetched:', userAccount);
      
      // Get the mint info for the LP token
      console.log('Fetching LP mint info...');
      const lpMint = await getMint(connection, new PublicKey(LP_TOKEN_MINT));
      console.log('LP mint info fetched:', lpMint);
  
      const transaction = new Transaction();
  
      console.log('Creating transfer instruction...');
      // Add instruction to transfer Home token to receiver
      transaction.add(
        createTransferInstruction(
          new PublicKey(HOME_TOKEN_ACCOUNT),
          new PublicKey(RECEIVER_ACCOUNT),
          publicKey,
          tokenAmount // amount to transfer
        )
      );
  
      console.log('Creating mint instruction...');
      // Add instruction to mint LP token to user
      transaction.add(
        createMintToInstruction(
          new PublicKey(LP_TOKEN_MINT),
          userAccount.address, // Assuming the user's associated token account for LP tokens
          publicKey,
          tokenAmount // amount to mint
        )
      );
  
      console.log('Sending transaction...');
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent. Signature:', signature);
  
      console.log('Confirming transaction...');
      await connection.confirmTransaction(signature, 'processed');
      console.log('Transaction confirmed');
  
      alert(`Swap successful! Swapped ${amount} Home tokens for LP tokens.`);
      setAmount(''); // Reset input after successful swap
    } catch (error) {
      console.error('Swap failed. Detailed error:', error);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }
      alert(`Swap failed. Error: ${error.message}`);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount of Home tokens to swap"
      />
      <button onClick={handleSwap}>Swap</button>
    </div>
  );
}

export default SwapButton;