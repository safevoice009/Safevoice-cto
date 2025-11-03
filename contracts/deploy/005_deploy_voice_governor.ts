import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const GOVERNOR_SETTINGS = {
  votingDelay: 1,
  votingPeriod: 45818,
  proposalThreshold: '1000000000000000000000',
  quorumPercentage: 4,
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  log('Deploying VoiceGovernor...');

  const voiceVotingToken = await get('VoiceVotingToken');

  const voiceGovernor = await deploy('VoiceGovernor', {
    from: deployer,
    args: [
      voiceVotingToken.address,
      GOVERNOR_SETTINGS.votingDelay,
      GOVERNOR_SETTINGS.votingPeriod,
      GOVERNOR_SETTINGS.proposalThreshold,
      GOVERNOR_SETTINGS.quorumPercentage,
    ],
    log: true,
    waitConfirmations: 1,
  });

  log(`VoiceGovernor deployed to: ${voiceGovernor.address}`);
  log(`Deployed by: ${deployer}`);
  log(`Gas used: ${voiceGovernor.receipt?.gasUsed?.toString() || 'N/A'}`);

  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    log('Waiting for block confirmations...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    log('Verifying contract on Etherscan...');
    try {
      await hre.run('verify:verify', {
        address: voiceGovernor.address,
        constructorArguments: [
          voiceVotingToken.address,
          GOVERNOR_SETTINGS.votingDelay,
          GOVERNOR_SETTINGS.votingPeriod,
          GOVERNOR_SETTINGS.proposalThreshold,
          GOVERNOR_SETTINGS.quorumPercentage,
        ],
      });
      log('✅ Contract verified on explorer');
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  return true;
};

func.tags = ['VoiceGovernor', 'governance', 'all'];
func.dependencies = ['VoiceVotingToken'];
export default func;
