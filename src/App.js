import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletConnectionProvider } from './WalletConnectionProvider';
import './App.css';
import SwapComponent from './SwapComponent';
import TestTransfer from './TestTransfer';
import SolflareIncluded from './SolflareIncluded';
import Navbar from './Navbar';

function App() {
  return (
    <>
     <Navbar />
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