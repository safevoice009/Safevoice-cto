const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VoiceGovernor', function () {
  let voiceToken;
  let voiceStaking;
  let voiceVotingToken;
  let voiceGovernor;
  let admin;
  let proposer;
  let voter1;
  let voter2;
  let voter3;

  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

  const STAKE_AMOUNT = ethers.utils.parseEther('1000');
  const REWARD_AMOUNT = ethers.utils.parseEther('100000');
  const MIN_LOCK_PERIOD = 7 * 24 * 60 * 60;

  beforeEach(async function () {
    [admin, proposer, voter1, voter2, voter3] = await ethers.getSigners();

    const VoiceTokenFactory = await ethers.getContractFactory('VoiceToken');
    voiceToken = await VoiceTokenFactory.deploy(admin.address);
    await voiceToken.deployed();
    
    await voiceToken.connect(admin).grantRole(MINTER_ROLE, admin.address);
    await voiceToken.connect(admin).mint(proposer.address, REWARD_AMOUNT);
    await voiceToken.connect(admin).mint(voter1.address, REWARD_AMOUNT);
    await voiceToken.connect(admin).mint(voter2.address, REWARD_AMOUNT);
    await voiceToken.connect(admin).mint(voter3.address, REWARD_AMOUNT);

    const VoiceStakingFactory = await ethers.getContractFactory('VoiceStaking');
    const MAX_LOCK_PERIOD = 365 * 24 * 60 * 60;
    const EARLY_UNSTAKE_PENALTY = 1000;
    voiceStaking = await VoiceStakingFactory.deploy(
      voiceToken.address,
      admin.address,
      MIN_LOCK_PERIOD,
      MAX_LOCK_PERIOD,
      EARLY_UNSTAKE_PENALTY
    );
    await voiceStaking.deployed();
    
    const VoiceVotingTokenFactory = await ethers.getContractFactory('VoiceVotingToken');
    voiceVotingToken = await VoiceVotingTokenFactory.deploy(voiceStaking.address);
    await voiceVotingToken.deployed();
    
    await voiceStaking.connect(admin).setVotingToken(voiceVotingToken.address);

    const VoiceGovernorFactory = await ethers.getContractFactory('VoiceGovernor');
    voiceGovernor = await VoiceGovernorFactory.deploy(
      voiceVotingToken.address,
      1,
      5,
      ethers.utils.parseEther('100'),
      4
    );
    await voiceGovernor.deployed();

    await voiceToken.connect(proposer).approve(voiceStaking.address, STAKE_AMOUNT);
    await voiceToken.connect(voter1).approve(voiceStaking.address, STAKE_AMOUNT);
    await voiceToken.connect(voter2).approve(voiceStaking.address, STAKE_AMOUNT);
    await voiceToken.connect(voter3).approve(voiceStaking.address, STAKE_AMOUNT);
    
    await voiceStaking.connect(proposer).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    await voiceStaking.connect(voter1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    await voiceStaking.connect(voter2).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    await voiceStaking.connect(voter3).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
  });

  describe('Deployment', function () {
    it('Should set correct parameters', async function () {
      expect(await voiceGovernor.votingDelay()).to.equal(1);
      expect(await voiceGovernor.votingPeriod()).to.equal(5);
      expect(await voiceGovernor.proposalThreshold()).to.equal(ethers.utils.parseEther('100'));
      expect(await voiceGovernor.quorumNumerator()).to.equal(4);
    });

    it('Should set the correct token address', async function () {
      expect(await voiceGovernor.token()).to.equal(voiceVotingToken.address);
    });
  });

  describe('Governance Flow', function () {
    let targets;
    let values;
    let calldatas;
    let description;

    beforeEach(async function () {
      targets = [voiceToken.address];
      values = [0];
      calldatas = [voiceToken.interface.encodeFunctionData('transfer', [voter1.address, ethers.utils.parseEther('100')])];
      description = 'Transfer 100 VOICE to voter1';

      await voiceVotingToken.connect(proposer).delegate(proposer.address);
      await voiceVotingToken.connect(voter1).delegate(voter1.address);
      await voiceVotingToken.connect(voter2).delegate(voter2.address);
      await voiceVotingToken.connect(voter3).delegate(voter3.address);
    });

    it('Should allow proposing', async function () {
      await expect(
        voiceGovernor.connect(proposer).propose(targets, values, calldatas, description)
      ).to.emit(voiceGovernor, 'ProposalCreated');
    });

    it('Should execute full governance flow', async function () {
      const proposalId = await voiceGovernor.connect(proposer).callStatic.propose(targets, values, calldatas, description);
      await voiceGovernor.connect(proposer).propose(targets, values, calldatas, description);

      await ethers.provider.send('evm_mine', []);

      await voiceGovernor.connect(voter1).castVote(proposalId, 1);
      await voiceGovernor.connect(voter2).castVote(proposalId, 1);
      await voiceGovernor.connect(voter3).castVote(proposalId, 0);

      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      await expect(voiceGovernor.execute(targets, values, calldatas, ethers.utils.id(description)))
        .to.emit(voiceGovernor, 'ProposalExecuted');
    });

    it('Should fail if quorum not met', async function () {
      const proposalId = await voiceGovernor.connect(proposer).callStatic.propose(targets, values, calldatas, description);
      await voiceGovernor.connect(proposer).propose(targets, values, calldatas, description);

      await ethers.provider.send('evm_mine', []);

      await voiceGovernor.connect(voter1).castVote(proposalId, 1);

      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      await expect(
        voiceGovernor.execute(targets, values, calldatas, ethers.utils.id(description))
      ).to.be.revertedWith('Governor: proposal not successful');
    });

    it('Should allow proposal cancellation', async function () {
      const proposalId = await voiceGovernor.connect(proposer).callStatic.propose(targets, values, calldatas, description);
      await voiceGovernor.connect(proposer).propose(targets, values, calldatas, description);

      await voiceVotingToken.connect(proposer).transfer(voter1.address, await voiceVotingToken.balanceOf(proposer.address));

      await expect(
        voiceGovernor.connect(proposer).cancel(targets, values, calldatas, ethers.utils.id(description))
      ).to.emit(voiceGovernor, 'ProposalCanceled')
        .withArgs(proposalId);
    });

    it('Should allow delegation', async function () {
      await voiceVotingToken.connect(voter1).delegate(voter2.address);

      const votes = await voiceGovernor.getVotes(voter2.address, await ethers.provider.getBlockNumber());
      expect(votes).to.be.gt(0);
    });

    it('Should calculate quorum correctly', async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const quorum = await voiceGovernor.quorum(blockNumber);
      expect(quorum).to.be.gt(0);
    });

    it('Should restrict proposal threshold', async function () {
      await voiceVotingToken.connect(voter1).transfer(voter2.address, await voiceVotingToken.balanceOf(voter1.address));
      
      await expect(
        voiceGovernor.connect(voter1).propose(targets, values, calldatas, description)
      ).to.be.revertedWith('Governor: proposer votes below proposal threshold');
    });
  });

  describe('Security', function () {
    it('Should prevent executing failed proposals', async function () {
      const targets = [voiceToken.address];
      const values = [0];
      const calldatas = [voiceToken.interface.encodeFunctionData('transfer', [voter1.address, ethers.utils.parseEther('100')])];
      const description = 'Failed proposal';

      await voiceVotingToken.connect(proposer).delegate(proposer.address);
      const proposalId = await voiceGovernor.connect(proposer).callStatic.propose(targets, values, calldatas, description);
      await voiceGovernor.connect(proposer).propose(targets, values, calldatas, description);

      await ethers.provider.send('evm_mine', []);

      await voiceGovernor.connect(voter1).castVote(proposalId, 0);
      await voiceGovernor.connect(voter2).castVote(proposalId, 0);
      await voiceGovernor.connect(voter3).castVote(proposalId, 0);

      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      await expect(
        voiceGovernor.execute(targets, values, calldatas, ethers.utils.id(description))
      ).to.be.revertedWith('Governor: proposal not successful');
    });

    it('Should prevent proposal duplication', async function () {
      const targets = [voiceToken.address];
      const values = [0];
      const calldatas = [voiceToken.interface.encodeFunctionData('transfer', [voter1.address, ethers.utils.parseEther('100')])];
      const description = 'Duplicate proposal';

      await voiceVotingToken.connect(proposer).delegate(proposer.address);
      await voiceGovernor.connect(proposer).propose(targets, values, calldatas, description);

      await expect(
        voiceGovernor.connect(proposer).propose(targets, values, calldatas, description)
      ).to.be.revertedWith('Governor: proposal already exists');
    });

    it('Should enforce voting delay', async function () {
      const targets = [voiceToken.address];
      const values = [0];
      const calldatas = [voiceToken.interface.encodeFunctionData('transfer', [voter1.address, ethers.utils.parseEther('100')])];
      const description = 'Voting delay test';

      await voiceVotingToken.connect(proposer).delegate(proposer.address);
      const proposalId = await voiceGovernor.connect(proposer).callStatic.propose(targets, values, calldatas, description);
      await voiceGovernor.connect(proposer).propose(targets, values, calldatas, description);

      await expect(
        voiceGovernor.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWith('Governor: vote not currently active');
    });
  });
});
