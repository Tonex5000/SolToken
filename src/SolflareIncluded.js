import React, { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

const solana = new Connection("https://solemn-boldest-firefly.solana-mainnet.quiknode.pro/121d45fc4c2e2c713f8c2f2b0559d3324fe12a1e/");

const tokenMintAddress = new PublicKey('GMWhFAjvmkEkSoU8MepbbeTdWhSZJr3nTY3VM3SATd91');

const checkTokenAccount = async (connection, publicKey, tokenMintAddress) => {
  const tokenAccount = await getAssociatedTokenAddress(tokenMintAddress, publicKey);
  const accountInfo = await connection.getAccountInfo(tokenAccount);
  return accountInfo !== null;
};

const createTokenAccount = async (connection, publicKey, tokenMintAddress, wallet) => {
  const tokenAccount = await getAssociatedTokenAddress(tokenMintAddress, publicKey);
  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      publicKey,
      tokenAccount,
      publicKey,
      tokenMintAddress
    )
  );
  const { blockhash } = await connection.getRecentBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;
  
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature);
};

const getTokenBalance = async (connection, publicKey, tokenMintAddress) => {
  const tokenAccount = await getAssociatedTokenAddress(tokenMintAddress, publicKey);
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    console.log("Token balance:", balance.value.uiAmount);
    return balance.value.uiAmount;
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return 0;
  }
};

const verifyTokenAccount = async (connection, publicKey, tokenMintAddress) => {
  const tokenAccount = await getAssociatedTokenAddress(tokenMintAddress, publicKey);
  try {
    const accountInfo = await connection.getParsedAccountInfo(tokenAccount);
    console.log("Token Account Info:", accountInfo);
    if (accountInfo.value) {
      console.log("Token Account Balance:", accountInfo.value.data.parsed.info.tokenAmount.uiAmount);
    } else {
      console.log("Token Account does not exist");
    }
  } catch (error) {
    console.error("Error verifying token account:", error);
  }
};

const verifyTokenMint = async (connection, tokenMintAddress) => {
  try {
    const mintInfo = await connection.getParsedAccountInfo(tokenMintAddress);
    console.log("Token Mint Info:", mintInfo);
  } catch (error) {
    console.error("Error verifying token mint:", error);
  }
};

const TestTransfer = () => {
  const [amount, setAmount] = useState('');
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [depositStatus, setDepositStatus] = useState(null);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [wallet, setWallet] = useState(null);

  const fixedRecipientAddress = new PublicKey('2PJEwHZEEJWiXwWyk7hbQDY3tGyWtdrymAqKJhkWupF1');

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.solana && window.solana.isPhantom) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true });
          setPublicKey(response.publicKey);
          setWallet(window.solana);
        } catch (error) {
          console.log("Phantom wallet not connected");
        }
      } else if (window.solflare && window.solflare.isSolflare) {
        try {
          const response = await window.solflare.connect({ onlyIfTrusted: true });
          setPublicKey(response.publicKey);
          setWallet(window.solflare);
        } catch (error) {
          console.log("Solflare wallet not connected");
        }
      }
    };

    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (publicKey) {
      fetchBalance();
      verifyAccount();
      verifyTokenMint(solana, tokenMintAddress);
    }
  }, [publicKey]);

  const connectWallet = async (walletName) => {
    let selectedWallet;
    if (walletName === 'phantom') {
      selectedWallet = window.solana;
    } else if (walletName === 'solflare') {
      selectedWallet = window.solflare;
    }
  
    if (!selectedWallet) {
      setTransactionStatus(`${walletName} wallet is not installed!`);
      return;
    }
  
    try {
      console.log(`Attempting to connect to ${walletName} wallet...`);
      
      let publicKey;
      
      if (walletName === 'phantom') {
        const response = await selectedWallet.connect();
        console.log(`Raw response from Phantom:`, response);
        publicKey = response.publicKey;
      } else if (walletName === 'solflare') {
        await selectedWallet.connect();
        publicKey = selectedWallet.publicKey;
        console.log(`Solflare public key:`, publicKey);
      }
  
      if (!publicKey) {
        throw new Error('Unable to retrieve public key from wallet');
      }
  
      setPublicKey(publicKey);
      setWallet(selectedWallet);
  
      const publicKeyString = typeof publicKey.toString === 'function' 
        ? publicKey.toString() 
        : JSON.stringify(publicKey);
  
      console.log(`Connected to ${walletName} wallet. Public key:`, publicKeyString);
      setTransactionStatus(`Connected to ${walletName} wallet`);
    } catch (error) {
      console.error(`Error connecting to ${walletName} wallet:`, error);
      setTransactionStatus(`Error: ${error.message}`);
    }
  };

  const fetchBalance = async () => {
    if (publicKey) {
      const balance = await getTokenBalance(solana, publicKey, tokenMintAddress);
      setTokenBalance(balance);
    }
  };

  const verifyAccount = async () => {
    if (publicKey) {
      await verifyTokenAccount(solana, publicKey, tokenMintAddress);
    }
  };

  const recordDepositOnBackend = async (walletAddress, amount) => {
    try {
      const response = await fetch('https://backend-wmqj.onrender.com/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: amount,
          status: 'completed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record deposit');
      }

      const data = await response.json();
      setDepositStatus(`Staking recorded. Total Staked: ${data.total_deposited}`);
    } catch (error) {
      setDepositStatus(`Error recording Staking: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!publicKey || !wallet) {
      setTransactionStatus('Please connect your wallet first.');
      return;
    }

    const tokenAccountExists = await checkTokenAccount(solana, publicKey, tokenMintAddress);
    if (!tokenAccountExists) {
      setTransactionStatus('Token account does not exist. Creating it now...');
      try {
        await createTokenAccount(solana, publicKey, tokenMintAddress, wallet);
        setTransactionStatus('Token account created successfully.');
      } catch (error) {
        setTransactionStatus(`Error creating token account: ${error.message}`);
        return;
      }
    }

    const balance = await getTokenBalance(solana, publicKey, tokenMintAddress);
    if (balance < parseFloat(amount)) {
      setTransactionStatus(`Insufficient balance. You have ${balance} tokens.`);
      return;
    }

    try {
      if (!wallet.isConnected) {
        throw new Error("Wallet is not connected");
      }
    
      const senderTokenAccountPubkey = await getAssociatedTokenAddress(
        tokenMintAddress,
        publicKey
      );
    
      const recipientTokenAccountPubkey = await getAssociatedTokenAddress(
        tokenMintAddress,
        fixedRecipientAddress
      );
    
      console.log("Sender Token Account:", senderTokenAccountPubkey.toString());
      console.log("Recipient Token Account:", recipientTokenAccountPubkey.toString());
      console.log("Amount to transfer:", amount);

      let transaction = new Transaction();
    
      const senderAccountInfo = await solana.getAccountInfo(senderTokenAccountPubkey);

      if (!senderAccountInfo) {
        console.log("Creating sender's token account");
        const createAccountInstruction = createAssociatedTokenAccountInstruction(
          publicKey,
          senderTokenAccountPubkey,
          publicKey,
          tokenMintAddress
        );
        transaction.add(createAccountInstruction);
      }

      const recipientAccountInfo = await solana.getAccountInfo(recipientTokenAccountPubkey);
      if (!recipientAccountInfo) {
        console.log("Creating recipient's token account");
        const createRecipientAccountInstruction = createAssociatedTokenAccountInstruction(
          publicKey,
          recipientTokenAccountPubkey,
          fixedRecipientAddress,
          tokenMintAddress
        );
        transaction.add(createRecipientAccountInstruction);
      }

      const tokenMintInfo = await solana.getParsedAccountInfo(tokenMintAddress);
      const decimals = tokenMintInfo.value.data.parsed.info.decimals;

      const transferInstruction = createTransferInstruction(
        senderTokenAccountPubkey,
        recipientTokenAccountPubkey,
        publicKey,
        parseInt(parseFloat(amount) * Math.pow(10, decimals))
      );

      transaction.add(transferInstruction);

      const { blockhash, lastValidBlockHeight } = await solana.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      let signed;
      if (wallet.isSolflare) {
        signed = await wallet.signTransaction(transaction);
      } else {
        signed = await wallet.signAndSendTransaction(transaction);
      }

      console.log("Sending transaction...");
      let signature;
      if (wallet.isSolflare) {
        const rawTransaction = signed.serialize();
        signature = await solana.sendRawTransaction(rawTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });
      } else {
        signature = signed.signature;
      }

      console.log("Transaction sent with signature:", signature);

      console.log("Confirming transaction...");
      const confirmation = await solana.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setTransactionStatus(`Transaction successful with signature: ${signature}`);
    
      await recordDepositOnBackend(publicKey.toString(), amount);
    } catch (error) {
      console.error("Detailed error:", error);
      
      if (error.logs) {
        console.error("Transaction logs:");
        error.logs.forEach((log, index) => {
          console.error(`Log ${index}:`, log);
        });
        setTransactionStatus(`Transaction failed. Logs: ${error.logs.join('\n')}`);
      } else {
        console.error("Error details:", error.message);
        setTransactionStatus(`Error during token transfer: ${error.message}`);
      }
      
      if (error.message.includes("Attempt to debit an account but found no record of a prior credit")) {
        console.error("This error suggests that the token account doesn't have sufficient balance or doesn't exist.");
        setTransactionStatus("Transfer failed: Insufficient balance or token account doesn't exist.");
      }
    }
  };

  return (
    <div>
      <h1>Transfer SPL Token</h1>
      {publicKey ? (
        <>
          <p>Connected: {publicKey.toString()}</p>
          <p>Wallet Type: {wallet.isSolflare ? 'Solflare' : 'Phantom'}</p>
          <p>Token Balance: {tokenBalance !== null ? tokenBalance : 'Loading...'}</p>
        </>
      ) : (
        <>
          <button onClick={() => connectWallet('phantom')}>Connect Phantom Wallet</button>
          <button onClick={() => connectWallet('solflare')}>Connect Solflare Wallet</button>
        </>
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





















export default TestTransfer;