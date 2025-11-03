import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying VoiceVesting...');

  const voiceToken = await get('VoiceToken');
  log(`Using VoiceToken at: ${voiceToken.address}`);

  const voiceVesting = await deploy('VoiceVesting', {
    from: deployer,
    args: [voiceToken.address, deployer],
    log: true,
    waitConfirmations: 1,
  });

  log(`VoiceVesting deployed to: ${voiceVesting.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${voiceVesting.receipt?.gasUsed?.toString() || 'N/A'}`);

  const vesting = await ethers.getContractAt('VoiceVesting', voiceVesting.address);
  const token = await ethers.getContractAt('VoiceToken', voiceToken.address);

  const communityAllocation = await vesting.COMMUNITY_ALLOCATION();
  const treasuryAllocation = await vesting.TREASURY_ALLOCATION();
  const teamAllocation = await vesting.TEAM_ALLOCATION();
  const ecosystemAllocation = await vesting.ECOSYSTEM_ALLOCATION();
  const totalAllocation = await vesting.TOTAL_ALLOCATION();

  log('\n📊 Vesting Allocations:');
  log(`  Community: ${ethers.utils.formatEther(communityAllocation)} VOICE (40%)`);
  log(`  Treasury:  ${ethers.utils.formatEther(treasuryAllocation)} VOICE (25%)`);
  log(`  Team:      ${ethers.utils.formatEther(teamAllocation)} VOICE (20%)`);
  log(`  Ecosystem: ${ethers.utils.formatEther(ecosystemAllocation)} VOICE (15%)`);
  log(`  Total:     ${ethers.utils.formatEther(totalAllocation)} VOICE (100%)\n`);

  log('🔐 Granting MINTER_ROLE to VoiceVesting...');
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
  const hasRole = await token.hasRole(MINTER_ROLE, voiceVesting.address);
  
  if (!hasRole) {
    const grantTx = await token.grantRole(MINTER_ROLE, voiceVesting.address);
    await grantTx.wait();
    log('✅ MINTER_ROLE granted to VoiceVesting');
  } else {
    log('✅ VoiceVesting already has MINTER_ROLE');
  }

  const timelockDelay = await vesting.TIMELOCK_DELAY();
  log(`\n⏰ Timelock Delay: ${timelockDelay.toNumber() / 3600} hours`);

  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    log('Verifying contract on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address: voiceVesting.address,
        constructorArguments: [voiceToken.address, deployer],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['VoiceVesting', 'all'];
func.dependencies = ['VoiceToken'];
export default func;
