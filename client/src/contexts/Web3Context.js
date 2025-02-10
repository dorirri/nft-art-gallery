import React, { createContext, useContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import ArtGallery from '../contracts/ArtGallery.json';

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initWeb3 = async () => {
    try {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);

        const networkId = await web3Instance.eth.net.getId();
        const deployedNetwork = ArtGallery.networks[networkId];

        if (!deployedNetwork) {
          throw new Error('Please connect to the correct network');
        }

        const contractInstance = new web3Instance.eth.Contract(
          ArtGallery.abi,
          deployedNetwork.address
        );

        setWeb3(web3Instance);
        setContract(contractInstance);
        setLoading(false);

        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
        });

        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } else {
        throw new Error('Please install MetaMask');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    initWeb3();
  }, []);

  const contextValue = {
    web3,
    account,
    contract,
    loading,
    error
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};