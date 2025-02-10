const ArtGallery = artifacts.require("ArtGallery");
const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network, accounts) {
  try {
    await deployer.deploy(ArtGallery);
    const artGallery = await ArtGallery.deployed();
    
    console.log('ArtGallery deployed at:', artGallery.address);

    if (network !== 'development' && network !== 'test') {
      console.log('Waiting for 6 block confirmations...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute
      
      try {
        await hre.run('verify:verify', {
          address: artGallery.address,
          constructorArguments: []
        });
        console.log('Contract verified on Etherscan');
      } catch (error) {
        console.log('Error verifying contract:', error);
      }
    }

    const configPath = path.join(__dirname, '../client/src/contracts/address.json');
    const config = {
      ArtGallery: artGallery.address,
      network: network
    };

    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2)
    );

    console.log('Contract address written to frontend config');

    if (network === 'development') {
      await artGallery.createGallery(
        "main-gallery",
        "Main Gallery",
        "The primary gallery for all artworks",
        { from: accounts[0] }
      );
      console.log('Created initial gallery');

      const tokenURI = "ipfs://QmTest";
      await artGallery.createArtwork(
        "Test Artwork",
        tokenURI,
        web3.utils.toWei("0.1", "ether"),
        "main-gallery",
        10, 
        { from: accounts[0] }
      );
      console.log('Created test artwork');
    }

  } catch (error) {
    console.error('Error during deployment:', error);
    throw error;
  }
};