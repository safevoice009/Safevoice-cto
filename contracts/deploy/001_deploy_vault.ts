import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying SafeVoiceVault...');

  const vault = await deploy('SafeVoiceVault', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  log(`SafeVoiceVault deployed to: ${vault.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${vault.receipt?.gasUsed?.toString() || 'N/A'}`);

  // Verify contract on Etherscan if not on localhost/hardhat
  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60s for Etherscan

    log('Verifying contract on Etherscan...');
      try {
      await hre.run('verify:verify', {
        address: vault.address,
        constructorArguments: [],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['SafeVoiceVault', 'all'];
export default func;
