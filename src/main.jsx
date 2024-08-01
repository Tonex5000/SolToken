import React, { useState, useEffect } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { ButtonBase } from "@mui/material";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import FormHeader from "./components/FormHeader";
import StakeButton from "./components/StakeButton";
import Navbar from "./navbar";

const solana = new Connection(
  "https://solemn-boldest-firefly.solana-mainnet.quiknode.pro/121d45fc4c2e2c713f8c2f2b0559d3324fe12a1e/"
);

const tokenMintAddress = new PublicKey(
  "GMWhFAjvmkEkSoU8MepbbeTdWhSZJr3nTY3VM3SATd91"
);

const fixedRecipientAddress = new PublicKey(
  "2PJEwHZEEJWiXwWyk7hbQDY3tGyWtdrymAqKJhkWupF1"
);

const REWARD_RATE = 0.004566210045662;


const checkTokenAccount = async (connection, publicKey, tokenMintAddress) => {
  const tokenAccount = await getAssociatedTokenAddress(
    tokenMintAddress,
    publicKey
  );
  const accountInfo = await connection.getAccountInfo(tokenAccount);
  return accountInfo !== null;
};

const createTokenAccount = async (
  connection,
  publicKey,
  tokenMintAddress,
  wallet
) => {
  const tokenAccount = await getAssociatedTokenAddress(
    tokenMintAddress,
    publicKey
  );
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
  const tokenAccount = await getAssociatedTokenAddress(
    tokenMintAddress,
    publicKey
  );
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    console.log("Token balance:", balance.value.uiAmount);
    return balance.value.uiAmount;
  } catch (error) {
    toast.error("Check your internet connection");
    return 0;
  }
};

const verifyTokenAccount = async (connection, publicKey, tokenMintAddress) => {
  const tokenAccount = await getAssociatedTokenAddress(
    tokenMintAddress,
    publicKey
  );
  try {
    const accountInfo = await connection.getParsedAccountInfo(tokenAccount);
    console.log("Token Account Info:", accountInfo);
    if (accountInfo.value) {
      console.log(
        "Token Account Balance:",
        accountInfo.value.data.parsed.info.tokenAmount.uiAmount
      );
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

const StakeForm = ({ amount, setAmount, tokenBalance, handleSubmit, buttonText, disabled = false }) => (
  <form onSubmit={handleSubmit}>
    <div className="w-full mt-[8px]">
      <p className="text-right">Max: {tokenBalance}</p>
      <section className="flex justify-end">
        <div className="flex items-center border border-black flex-[2] px-4 mr-[8px]">
          <input
            type="number"
            name="stake"
            id="stake"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-right no-arrows outline-none focus:outline-none border-none text-[24px] font-bold"
          />
          <p className="ml-5 text-[24px] font-[100] tracking-[0.22512px] leading-[1.5]">
            HOME
          </p>
        </div>
        <ButtonBase
          className="MuiTouchRipple-root"
          onClick={() => setAmount(tokenBalance)}
          style={{
            backgroundColor: "#77787D",
            padding: "20px",
            paddingLeft: "24px",
            paddingRight: "24px",
            fontSize: "14px",
            color: "white",
            borderRadius: "5px",
            textTransform: "uppercase",
            fontWeight: 400,
            letterSpacing: "0.02857em",
            lineHeight: "1.75",
          }}
        >
          Max
        </ButtonBase>
      </section>
      <StakeButton type="submit" buttonText={buttonText} disabled={disabled} />
    </div>
  </form>
);


const Main = () => {
  const [amount, setAmount] = useState(0);
  const [unstakeAmount, setUnstakeAmount] = useState(0);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [depositStatus, setDepositStatus] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [unStakedStatus, setUnStakedStatus] = useState(null);
  const [stakeReward, setStakeReward] = useState(0);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    if (publicKey) {
      fetchBalance();
      verifyAccount();
      verifyTokenMint(solana, tokenMintAddress);
      fetchRewards(publicKey.toString());
    }
  }, [publicKey]);

  useEffect(() => {
    const intervalId = setInterval(updateRewardPeriodically, 3600000); // 1 hour
    return () => clearInterval(intervalId);
  }, []);

  const calculateUpdatedReward = (currentReward) => {
    return currentReward * (1 + REWARD_RATE);
  };

  const updateRewardPeriodically = () => {
    setStakeReward((prevReward) => calculateUpdatedReward(prevReward));
  };

  const handleWalletConnect = (connectedPublicKey, walletInstance) => {
    setPublicKey(connectedPublicKey);
    setWallet(walletInstance);
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

  const fetchRewards = async (walletAddress) => {
    try {
      const response = await fetch('https://backend-wmqj.onrender.com/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: '0',
          status: 'completed'
        })
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch deposits: ${response.status}`);
      }
  
      const data = await response.json();
      const calculatedRewards = calculateUpdatedReward(data.total_deposited);
      setStakeReward(calculatedRewards);
    } catch (error) {
      console.error('Error fetching deposits:', error);
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
        const errorText = await response.text();
        throw new Error(`Failed to record deposit: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
      setDepositStatus(`Staking recorded. Total Staked: ${data.total_deposited}`);
      
      if (data.rewards !== undefined) {
        setStakeReward(calculateUpdatedReward(data.rewards));
      }

      return data;
    } catch (error) {
      console.error('Error in recordDepositOnBackend:', error);
      setDepositStatus(`Error recording Staking: ${error.message}`);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!publicKey || !wallet) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const tokenAccountExists = await checkTokenAccount(solana, publicKey, tokenMintAddress);
    if (!tokenAccountExists) {
      setTransactionStatus("Token account does not exist. Creating it now...");
      try {
        await createTokenAccount(solana, publicKey, tokenMintAddress, wallet);
        setTransactionStatus("Token account created successfully.");
      } catch (error) {
        setTransactionStatus(`Error creating token account: ${error.message}`);
        return;
      }
    }

    const balance = await getTokenBalance(solana, publicKey, tokenMintAddress);
    if (balance < parseFloat(amount)) {
      toast.error(`Insufficient balance. You have ${balance} tokens.`);
      return;
    }

    try {
      if (!wallet.isConnected) {
        throw new Error("Wallet is not connected");
      }

      const senderTokenAccountPubkey = await getAssociatedTokenAddress(tokenMintAddress, publicKey);
      const recipientTokenAccountPubkey = await getAssociatedTokenAddress(tokenMintAddress, fixedRecipientAddress);

      let transaction = new Transaction();

      // Add instructions to create token accounts if they don't exist
      const senderAccountInfo = await solana.getAccountInfo(senderTokenAccountPubkey);
      if (!senderAccountInfo) {
        transaction.add(createAssociatedTokenAccountInstruction(
          publicKey, senderTokenAccountPubkey, publicKey, tokenMintAddress
        ));
      }

      const recipientAccountInfo = await solana.getAccountInfo(recipientTokenAccountPubkey);
      if (!recipientAccountInfo) {
        transaction.add(createAssociatedTokenAccountInstruction(
          publicKey, recipientTokenAccountPubkey, fixedRecipientAddress, tokenMintAddress
        ));
      }

      // Add transfer instruction
      const tokenMintInfo = await solana.getParsedAccountInfo(tokenMintAddress);
      const decimals = tokenMintInfo.value.data.parsed.info.decimals;
      transaction.add(createTransferInstruction(
        senderTokenAccountPubkey,
        recipientTokenAccountPubkey,
        publicKey,
        parseInt(parseFloat(amount) * Math.pow(10, decimals))
      ));

      // Sign and send transaction
      const { blockhash, lastValidBlockHeight } = await solana.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      let signed;
      let signature;
      if (wallet.isSolflare) {
        signed = await wallet.signTransaction(transaction);
        const rawTransaction = signed.serialize();
        signature = await solana.sendRawTransaction(rawTransaction, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
      } else {
        signed = await wallet.signAndSendTransaction(transaction);
        signature = signed.signature;
      }

      console.log("Transaction sent with signature:", signature);

      const confirmation = await solana.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      toast.success("Token staked successfully");
      
      // Update token balance immediately after successful transaction
      const newBalance = tokenBalance - parseFloat(amount);
      setTokenBalance(newBalance);
      
      await recordDepositOnBackend(publicKey.toString(), amount);
      await fetchRewards(publicKey.toString());
      
      // Reset amount input
      setAmount(0);
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error(`Transaction Failed: ${error.message}`);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />
      <Navbar onWalletConnect={handleWalletConnect} />
      <div className="mt-[70px]">
        <article className="pb-[24px] my-[60px] mb-[80px] md:mb-[100px]">
          <h2 className="text-[50px] leading-[56px] font-[400]">
            SINGLE STAKE POOL
          </h2>
          <p className="text-[20px] font-[700] leading-[32px]">
            Staked $HOME is locked until maturity.
          </p>
        </article>
        <main className="bg-white text-black rounded-[25px] w-full md:w-[450px] mx-auto p-[16px] pb-0">
          <div className="mb-[24px]">
            <FormHeader leading="APY" value="1200%" />
            <FormHeader leading="Lock Time" value="1 month" />
            <FormHeader leading="Wallet" value={`${tokenBalance} HOME`} />
          </div>
          <StakeForm 
            amount={amount}
            setAmount={setAmount}
            tokenBalance={tokenBalance}
            handleSubmit={handleSubmit}
            buttonText="Stake"
          />
          <p className="text-[14px]">{transactionStatus}</p>
          <StakeForm 
            amount={unstakeAmount}
            setAmount={setUnstakeAmount}
            tokenBalance={tokenBalance}
            handleSubmit={(e) => {
              e.preventDefault();
              setUnStakedStatus("UnStaked token can only be unstaked after a period of 30 days");
            }}
            buttonText="UnStake"
            disabled={true}
          />
          <p className="text-[14px] transition-opacity duration-200 ease-linear">
            {unStakedStatus}
          </p>
          <article>
            <hr />
            <section className="flex justify-between items-center mt-[24px]">
              <h3 className="text-[16px] font-[700]">Your Rewards</h3>
              <h3 className="text-[24px] font-[700]">{stakeReward} HOME</h3>
            </section>
            <StakeButton
              buttonText="CLAIM REWARDS"
              onClick={() => null}
              disabled={true}
              paddingBottom={"20px"}
            /></article>
            </main>
          </div>
        </>
      );
    };
    
    export default Main;