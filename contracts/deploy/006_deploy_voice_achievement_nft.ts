import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying VoiceAchievementNFT...');

  const BASE_URI = process.env.NFT_BASE_URI || 'https://api.safevoice.app/metadata/achievements/';

  const achievementNFT = await deploy('VoiceAchievementNFT', {
    from: deployer,
    args: [deployer, BASE_URI],
    log: true,
    waitConfirmations: 1,
  });

  log(`VoiceAchievementNFT deployed to: ${achievementNFT.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${achievementNFT.receipt?.gasUsed?.toString() || 'N/A'}`);
  log(`Base URI: ${BASE_URI}`);

  const nft = await ethers.getContractAt('VoiceAchievementNFT', achievementNFT.address);
  const name = await nft.name();
  const symbol = await nft.symbol();
  const baseURI = await nft.getBaseURI();

  log(`Name: ${name}`);
  log(`Symbol: ${symbol}`);
  log(`Base URI: ${baseURI}`);

  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    log('Verifying contract on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address: achievementNFT.address,
        constructorArguments: [deployer, BASE_URI],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['VoiceAchievementNFT', 'nft', 'all'];
export default func;
