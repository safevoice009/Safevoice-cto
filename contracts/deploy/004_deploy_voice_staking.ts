import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying VoiceStaking...');

  const voiceToken = await get('VoiceToken');
  log(`Using VoiceToken at: ${voiceToken.address}`);

  const MIN_LOCK_DURATION = 7 * 24 * 60 * 60; // 7 days
  const MAX_LOCK_DURATION = 365 * 24 * 60 * 60; // 1 year
  const EARLY_UNSTAKE_PENALTY = 1000; // 10%

  const voiceStaking = await deploy('VoiceStaking', {
    from: deployer,
    args: [voiceToken.address, deployer, MIN_LOCK_DURATION, MAX_LOCK_DURATION, EARLY_UNSTAKE_PENALTY],
    log: true,
    waitConfirmations: 1,
  });

  log(`VoiceStaking deployed to: ${voiceStaking.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${voiceStaking.receipt?.gasUsed?.toString() || 'N/A'}`);

  const staking = await ethers.getContractAt('VoiceStaking', voiceStaking.address);
  const totalStaked = await staking.totalStaked();
  const emergencyDelay = await staking.emergencyWithdrawalDelay();

  log(`Total Staked: ${ethers.utils.formatEther(totalStaked)} VOICE`);
  log(`Emergency Withdrawal Delay: ${emergencyDelay.toNumber() / (24 * 60 * 60)} days`);

  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    log('Verifying contract on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address: voiceStaking.address,
        constructorArguments: [voiceToken.address, deployer, MIN_LOCK_DURATION, MAX_LOCK_DURATION, EARLY_UNSTAKE_PENALTY],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['VoiceStaking', 'governance', 'all'];
func.dependencies = ['VoiceToken'];
export default func;
