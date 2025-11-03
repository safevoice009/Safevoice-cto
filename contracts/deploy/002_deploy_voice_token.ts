import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying VoiceToken...');

  const voiceToken = await deploy('VoiceToken', {
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: 1,
  });

  log(`VoiceToken deployed to: ${voiceToken.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${voiceToken.receipt?.gasUsed?.toString() || 'N/A'}`);

  const token = await ethers.getContractAt('VoiceToken', voiceToken.address);
  const totalSupply = await token.totalSupply();
  const supplyCap = await token.SUPPLY_CAP();

  log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} VOICE`);
  log(`Supply Cap: ${ethers.utils.formatEther(supplyCap)} VOICE`);

  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    log('Verifying contract on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address: voiceToken.address,
        constructorArguments: [deployer],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['VoiceToken', 'all'];
export default func;
