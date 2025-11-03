import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying VoiceVesting contract...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH\n');

  console.log('⚠️  Enter the VoiceToken contract address:');
  const voiceTokenAddress = process.env.VOICE_TOKEN_ADDRESS || '';
  
  if (!voiceTokenAddress || !ethers.utils.isAddress(voiceTokenAddress)) {
    throw new Error('Invalid VoiceToken address. Set VOICE_TOKEN_ADDRESS environment variable.');
  }

  console.log('Using VoiceToken at:', voiceTokenAddress);

  const VoiceVesting = await ethers.getContractFactory('VoiceVesting');
  console.log('Deploying VoiceVesting...');
  
  const voiceVesting = await VoiceVesting.deploy(voiceTokenAddress, deployer.address);
  await voiceVesting.deployed();

  console.log('\n✅ VoiceVesting deployed to:', voiceVesting.address);
  console.log('Deployment transaction:', voiceVesting.deployTransaction?.hash);

  const voiceToken = await ethers.getContractAt('VoiceToken', voiceTokenAddress);
  
  const communityAllocation = await voiceVesting.COMMUNITY_ALLOCATION();
  const treasuryAllocation = await voiceVesting.TREASURY_ALLOCATION();
  const teamAllocation = await voiceVesting.TEAM_ALLOCATION();
  const ecosystemAllocation = await voiceVesting.ECOSYSTEM_ALLOCATION();
  const totalAllocation = await voiceVesting.TOTAL_ALLOCATION();
  const timelockDelay = await voiceVesting.TIMELOCK_DELAY();

  console.log('\n📋 Contract Details:');
  console.log('- VoiceToken:', voiceTokenAddress);
  console.log('- Admin:', deployer.address);
  console.log('- Timelock Delay:', timelockDelay.toNumber() / 3600, 'hours');

  console.log('\n📊 Vesting Allocations:');
  console.log('┌─────────────┬──────────────────────┬─────────┐');
  console.log('│ Tranche     │ Allocation (VOICE)   │ Percent │');
  console.log('├─────────────┼──────────────────────┼─────────┤');
  console.log(`│ Community   │ ${ethers.utils.formatEther(communityAllocation).padEnd(20)} │ 40%     │`);
  console.log(`│ Treasury    │ ${ethers.utils.formatEther(treasuryAllocation).padEnd(20)} │ 25%     │`);
  console.log(`│ Team        │ ${ethers.utils.formatEther(teamAllocation).padEnd(20)} │ 20%     │`);
  console.log(`│ Ecosystem   │ ${ethers.utils.formatEther(ecosystemAllocation).padEnd(20)} │ 15%     │`);
  console.log('├─────────────┼──────────────────────┼─────────┤');
  console.log(`│ Total       │ ${ethers.utils.formatEther(totalAllocation).padEnd(20)} │ 100%    │`);
  console.log('└─────────────┴──────────────────────┴─────────┘');

  console.log('\n🔑 Role Configuration:');
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
  const REVOKER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REVOKER_ROLE'));
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));

  console.log('- Admin has DEFAULT_ADMIN_ROLE:', await voiceVesting.hasRole(DEFAULT_ADMIN_ROLE, deployer.address));
  console.log('- Admin has REVOKER_ROLE:', await voiceVesting.hasRole(REVOKER_ROLE, deployer.address));

  const hasVestingMinterRole = await voiceToken.hasRole(MINTER_ROLE, voiceVesting.address);
  console.log('- VoiceVesting has MINTER_ROLE on VoiceToken:', hasVestingMinterRole);

  if (!hasVestingMinterRole) {
    console.log('\n⚠️  WARNING: VoiceVesting needs MINTER_ROLE on VoiceToken to function!');
    console.log('Run this command after deployment:');
    console.log(`await voiceToken.grantRole(MINTER_ROLE, "${voiceVesting.address}");`);
  }

  console.log('\n⚠️  IMPORTANT: Save this information for configuration');
  console.log('VoiceVesting Address:', voiceVesting.address);
  console.log('VoiceToken Address:', voiceTokenAddress);

  console.log('\n🚀 Next Steps:');
  console.log('1. Grant MINTER_ROLE to VoiceVesting on VoiceToken contract');
  console.log('2. Create vesting schedules for each tranche');
  console.log('3. Update frontend configuration with contract addresses');
  console.log('4. Run "npm run export:abis" to generate ABI exports');
  console.log('5. Document vesting schedules and beneficiaries');

  console.log('\n📝 Example: Create Vesting Schedule');
  console.log(`const tx = await voiceVesting.createVestingSchedule(`);
  console.log(`  "<BENEFICIARY_ADDRESS>",`);
  console.log(`  0, // TrancheType.COMMUNITY`);
  console.log(`  ethers.utils.parseEther("1000000"), // 1M tokens`);
  console.log(`  Math.floor(Date.now() / 1000), // Start now`);
  console.log(`  90 * 24 * 60 * 60, // 90 days cliff`);
  console.log(`  365 * 24 * 60 * 60, // 1 year duration`);
  console.log(`  true // Revocable`);
  console.log(`);`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
