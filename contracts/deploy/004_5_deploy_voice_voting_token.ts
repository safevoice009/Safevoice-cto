import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying VoiceVotingToken...');

  const voiceStaking = await get('VoiceStaking');
  log(`Using VoiceStaking at: ${voiceStaking.address}`);

  const voiceVotingToken = await deploy('VoiceVotingToken', {
    from: deployer,
    args: [voiceStaking.address],
    log: true,
    waitConfirmations: 1,
  });

  log(`VoiceVotingToken deployed to: ${voiceVotingToken.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${voiceVotingToken.receipt?.gasUsed?.toString() || 'N/A'}`);

  const staking = await ethers.getContractAt('VoiceStaking', voiceStaking.address, await ethers.getSigner(deployer));
  const hasVotingToken = await staking.hasVotingToken();

  if (!hasVotingToken) {
    const configureTx = await staking.setVotingToken(voiceVotingToken.address);
    await configureTx.wait();
    log(`Configured VoiceVotingToken on VoiceStaking: ${configureTx.hash}`);
  } else {
    log('VoiceStaking already configured with a voting token, skipping setVotingToken call.');
  }

  const votingToken = await ethers.getContractAt('VoiceVotingToken', voiceVotingToken.address);
  const stakingContract = await votingToken.stakingContract();
  const totalSupply = await votingToken.totalSupply();

  log(`Staking Contract: ${stakingContract}`);
  log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} vVOICE`);

  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    log('Verifying contract on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address: voiceVotingToken.address,
        constructorArguments: [voiceStaking.address],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['VoiceVotingToken', 'governance', 'all'];
func.dependencies = ['VoiceStaking'];
export default func;
