import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying VoiceToken contract...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH\n');

  const VoiceToken = await ethers.getContractFactory('VoiceToken');
  console.log('Deploying contract...');
  
  const voiceToken = await VoiceToken.deploy(deployer.address);
  await voiceToken.deployed();

  console.log('\n✅ VoiceToken deployed to:', voiceToken.address);
  console.log('Deployment transaction:', voiceToken.deployTransaction?.hash);

  const totalSupply = await voiceToken.totalSupply();
  const supplyCap = await voiceToken.SUPPLY_CAP();
  const remainingMintable = await voiceToken.remainingMintableSupply();
  const name = await voiceToken.name();
  const symbol = await voiceToken.symbol();
  const decimals = await voiceToken.decimals();
  
  const DEFAULT_ADMIN_ROLE = await voiceToken.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await voiceToken.MINTER_ROLE();
  const BURNER_ROLE = await voiceToken.BURNER_ROLE();
  const BRIDGE_ROLE = await voiceToken.BRIDGE_ROLE();

  console.log('\n📋 Contract Details:');
  console.log('- Name:', name);
  console.log('- Symbol:', symbol);
  console.log('- Decimals:', decimals);
  console.log('- Total Supply:', ethers.utils.formatEther(totalSupply), 'VOICE');
  console.log('- Supply Cap:', ethers.utils.formatEther(supplyCap), 'VOICE');
  console.log('- Remaining Mintable:', ethers.utils.formatEther(remainingMintable), 'VOICE');

  console.log('\n🔑 Roles Configuration:');
  console.log('- Admin:', deployer.address);
  console.log('  - Has DEFAULT_ADMIN_ROLE:', await voiceToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address));
  console.log('\n📝 Role Hashes:');
  console.log('- DEFAULT_ADMIN_ROLE:', DEFAULT_ADMIN_ROLE);
  console.log('- MINTER_ROLE:', MINTER_ROLE);
  console.log('- BURNER_ROLE:', BURNER_ROLE);
  console.log('- BRIDGE_ROLE:', BRIDGE_ROLE);

  console.log('\n⚠️  IMPORTANT: Save this information for configuration');
  console.log('Contract Address:', voiceToken.address);
  console.log('\n🚀 Next Steps:');
  console.log('1. Grant MINTER_ROLE to reward system address');
  console.log('2. Grant BURNER_ROLE to authorized contracts');
  console.log('3. Grant BRIDGE_ROLE to bridge contract address');
  console.log('4. Update frontend configuration with contract address');
  console.log('5. Run "npm run export:abis" to generate ABI exports');
  console.log('\nExample commands:');
  console.log(`await voiceToken.grantRole(MINTER_ROLE, "<REWARD_SYSTEM_ADDRESS>");`);
  console.log(`await voiceToken.grantRole(BURNER_ROLE, "<AUTHORIZED_ADDRESS>");`);
  console.log(`await voiceToken.grantRole(BRIDGE_ROLE, "<BRIDGE_CONTRACT_ADDRESS>");`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
