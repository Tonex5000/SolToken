import React, { useState } from 'react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

function JupiterSwap() {
  const [inputAmount, setInputAmount] = useState('');
  const [txid, setTxid] = useState(null);
  const [error, setError] = useState(null);
  const { publicKey, signTransaction } = useWallet();
  const connection = new Connection('https://solemn-boldest-firefly.solana-mainnet.quiknode.pro/121d45fc4c2e2c713f8c2f2b0559d3324fe12a1e/');

  const HOME_TOKEN_ADDRESS = 'GMWhFAjvmkEkSoU8MepbbeTdWhSZJr3nTY3VM3SATd91';
  const LP_TOKEN_ADDRESS = 'BCktaSSx11ccr5RLVT2z5k8T78ysvnZyoxumC2cxuRxv';
  const HOME_TOKEN_DECIMALS = 6; // Replace with the actual number of decimals for your HOME token
  const LP_TOKEN_DECIMALS = 6; // Replace with the actual number of decimals for your LP token

  const handleSwap = async () => {
    if (!inputAmount || !publicKey) {
      setError("Please enter an amount and connect your wallet.");
      return;
    }

    setError(null);
    setTxid(null);

    try {
      // Convert input amount to the smallest unit based on decimals
      const amountInSmallestUnit = Math.floor(parseFloat(inputAmount) * Math.pow(10, HOME_TOKEN_DECIMALS));

      // 1. Get initial quote to determine exchange rate
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${HOME_TOKEN_ADDRESS}&outputMint=${LP_TOKEN_ADDRESS}&amount=${amountInSmallestUnit}&slippageBps=50`;
      const quoteResponse = await fetch(quoteUrl);
      
      if (!quoteResponse.ok) {
        const errorText = await quoteResponse.text();
        throw new Error(`Quote API error: ${quoteResponse.status} ${errorText}`);
      }

      const quoteData = await quoteResponse.json();
      console.log('Initial quote data:', quoteData);

      // Calculate the exchange rate
      const exchangeRate = parseInt(quoteData.outAmount) / amountInSmallestUnit;

      // Adjust the input amount to achieve 1:1 ratio
      const adjustedAmount = Math.floor(amountInSmallestUnit / exchangeRate);

      console.log(`Adjusted amount for 1:1 ratio: ${adjustedAmount}`);

      // 2. Get new quote with adjusted amount
      const adjustedQuoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${HOME_TOKEN_ADDRESS}&outputMint=${LP_TOKEN_ADDRESS}&amount=${adjustedAmount}&slippageBps=50`;
      const adjustedQuoteResponse = await fetch(adjustedQuoteUrl);
      
      if (!adjustedQuoteResponse.ok) {
        const errorText = await adjustedQuoteResponse.text();
        throw new Error(`Adjusted quote API error: ${adjustedQuoteResponse.status} ${errorText}`);
      }

      const adjustedQuoteData = await adjustedQuoteResponse.json();
      console.log('Adjusted quote data:', adjustedQuoteData);

      // 3. Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: adjustedQuoteData,
          userPublicKey: publicKey.toString(),
          wrapUnwrapSOL: false
        })
      });
      const swapData = await swapResponse.json();

      if (swapData.error) {
        throw new Error(`Swap error: ${swapData.error}`);
      }

      if (!swapData.swapTransaction) {
        throw new Error('Swap transaction data is missing');
      }

      // 4. Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // 5. Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      // 6. Execute the transaction
      const rawTransaction = signedTransaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
      });
      setTxid(txid);

      // 7. Confirm transaction
      await connection.confirmTransaction(txid);
      console.log(`Swap completed: https://solscan.io/tx/${txid}`);
    } catch (error) {
      console.error('Swap failed:', error);
      setError(error.message);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={inputAmount}
        onChange={(e) => setInputAmount(e.target.value)}
        placeholder="Enter amount of HOME tokens"
      />
      <button onClick={handleSwap}>Swap HOME to LP Token (1:1)</button>
      {txid && <p>Transaction ID: {txid}</p>}
      {error && <p style={{color: 'red'}}>Error: {error}</p>}
    </div>
  );
}

export default JupiterSwap;