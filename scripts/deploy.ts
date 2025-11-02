import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying SafeVoiceVault contract...');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH');

  const SafeVoiceVault = await ethers.getContractFactory('SafeVoiceVault');
  const vault = await SafeVoiceVault.deploy();
  
  await vault.deployed();

  console.log('SafeVoiceVault deployed to:', vault.address);
  console.log('Deployment transaction:', vault.deployTransaction?.hash);

  // Verify contract details
  const owner = await vault.owner();
  const version = await vault.version();
  const paused = await vault.paused();

  console.log('\nContract Details:');
  console.log('- Owner:', owner);
  console.log('- Version:', version);
  console.log('- Paused:', paused);

  console.log('\n⚠️  IMPORTANT: Save this contract address for verification and frontend configuration');
  console.log('Contract Address:', address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
