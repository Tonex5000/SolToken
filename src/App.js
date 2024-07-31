import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletConnectionProvider } from './WalletConnectionProvider';
import './App.css';
import SwapComponent from './SwapComponent';
import TestTransfer from './TestTransfer';
import SolflareIncluded from './SolflareIncluded'

function App() {
  return (
    <>
     <SolflareIncluded />
    </>
  );
}

export default App;


/*     <WalletConnectionProvider>
      <div className="App">
        <header className="App-header">
          <WalletMultiButton />
          <TestTransfer />
        </header>
      </div>
    </WalletConnectionProvider> */