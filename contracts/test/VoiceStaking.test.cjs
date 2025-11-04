const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('VoiceStaking', function () {
  let voiceToken;
  let voiceStaking;
  let admin;
  let rewardsManager;
  let user1;
  let user2;
  let user3;

  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
  const REWARDS_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REWARDS_MANAGER_ROLE'));
  const EMERGENCY_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EMERGENCY_ROLE'));
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

  const STAKE_AMOUNT = ethers.utils.parseEther('1000');
  const REWARD_AMOUNT = ethers.utils.parseEther('10000');
  const MIN_LOCK_PERIOD = 7 * 24 * 60 * 60;

  beforeEach(async function () {
    [admin, rewardsManager, user1, user2, user3] = await ethers.getSigners();

    const VoiceTokenFactory = await ethers.getContractFactory('VoiceToken');
    voiceToken = await VoiceTokenFactory.deploy(admin.address);
    await voiceToken.deployed();

    const VoiceStakingFactory = await ethers.getContractFactory('VoiceStaking');
    const minLockDuration = MIN_LOCK_PERIOD;
    const maxLockDuration = 365 * 24 * 60 * 60; // 1 year
    const earlyUnstakePenaltyBps = 1000; // 10%
    voiceStaking = await VoiceStakingFactory.deploy(
      voiceToken.address,
      admin.address,
      minLockDuration,
      maxLockDuration,
      earlyUnstakePenaltyBps
    );
    await voiceStaking.deployed();

    // Deploy VoiceVotingToken
    const VoiceVotingTokenFactory = await ethers.getContractFactory('VoiceVotingToken');
    const votingToken = await VoiceVotingTokenFactory.deploy(voiceStaking.address);
    await votingToken.deployed();

    // Configure voting token
    await voiceStaking.connect(admin).setVotingToken(votingToken.address);

    await voiceToken.connect(admin).grantRole(MINTER_ROLE, admin.address);
    await voiceToken.connect(admin).mint(user1.address, ethers.utils.parseEther('100000'));
    await voiceToken.connect(admin).mint(user2.address, ethers.utils.parseEther('100000'));
    await voiceToken.connect(admin).mint(user3.address, ethers.utils.parseEther('100000'));
    await voiceToken.connect(admin).mint(rewardsManager.address, REWARD_AMOUNT);

    await voiceStaking.connect(admin).grantRole(REWARDS_MANAGER_ROLE, rewardsManager.address);
  });

  describe('Deployment', function () {
    it('Should set the correct token address', async function () {
      expect(await voiceStaking.voiceToken()).to.equal(voiceToken.address);
    });

    it('Should grant admin roles', async function () {
      expect(await voiceStaking.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await voiceStaking.hasRole(REWARDS_MANAGER_ROLE, rewardsManager.address)).to.be.true;
    });

    it('Should initialize with default chain config', async function () {
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const config = await voiceStaking.chainRewardConfigs(chainId);
      expect(config.enabled).to.be.true;
      expect(config.minStakePeriod).to.equal(MIN_LOCK_PERIOD);
    });

    it('Should revert if token address is zero', async function () {
      const VoiceStakingFactory = await ethers.getContractFactory('VoiceStaking');
      const minLockDuration = MIN_LOCK_PERIOD;
      const maxLockDuration = 365 * 24 * 60 * 60;
      const earlyUnstakePenaltyBps = 1000;
      await expect(
        VoiceStakingFactory.deploy(
          ethers.constants.AddressZero,
          admin.address,
          minLockDuration,
          maxLockDuration,
          earlyUnstakePenaltyBps
        )
      ).to.be.revertedWithCustomError(voiceStaking, 'ZeroAddress');
    });

    it('Should revert if admin address is zero', async function () {
      const VoiceStakingFactory = await ethers.getContractFactory('VoiceStaking');
      const minLockDuration = MIN_LOCK_PERIOD;
      const maxLockDuration = 365 * 24 * 60 * 60;
      const earlyUnstakePenaltyBps = 1000;
      await expect(
        VoiceStakingFactory.deploy(
          voiceToken.address,
          ethers.constants.AddressZero,
          minLockDuration,
          maxLockDuration,
          earlyUnstakePenaltyBps
        )
      ).to.be.revertedWithCustomError(voiceStaking, 'ZeroAddress');
    });
  });

  describe('Staking', function () {
    beforeEach(async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
    });

    it('Should allow users to stake tokens', async function () {
      await expect(voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD))
        .to.emit(voiceStaking, 'Staked')
        .withArgs(user1.address, STAKE_AMOUNT, MIN_LOCK_PERIOD, await ethers.provider.getNetwork().then(n => n.chainId));

      const stakeInfo = await voiceStaking.stakes(user1.address);
      expect(stakeInfo.amount).to.equal(STAKE_AMOUNT);
      expect(stakeInfo.lockPeriod).to.equal(MIN_LOCK_PERIOD);

      expect(await voiceStaking.totalStaked()).to.equal(STAKE_AMOUNT);
      expect(await voiceToken.balanceOf(voiceStaking.address)).to.equal(STAKE_AMOUNT);
    });

    it('Should allow multiple stakes from same user', async function () {
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
      
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);

      const stakeInfo = await voiceStaking.stakes(user1.address);
      expect(stakeInfo.amount).to.equal(STAKE_AMOUNT.mul(2));
    });

    it('Should revert on zero amount', async function () {
      await expect(
        voiceStaking.connect(user1).stake(0, MIN_LOCK_PERIOD)
      ).to.be.revertedWithCustomError(voiceStaking, 'ZeroAmount');
    });

    it('Should revert on lock period less than minimum', async function () {
      await expect(
        voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD - 1)
      ).to.be.revertedWithCustomError(voiceStaking, 'InvalidLockPeriod');
    });

    it('Should allow staking with custom lock periods', async function () {
      const customLockPeriod = MIN_LOCK_PERIOD * 2;
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, customLockPeriod);

      const stakeInfo = await voiceStaking.stakes(user1.address);
      expect(stakeInfo.lockPeriod).to.equal(customLockPeriod);
    });

    it('Should track chainId in stake info', async function () {
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);

      const stakeInfo = await voiceStaking.stakes(user1.address);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      expect(stakeInfo.chainId).to.equal(chainId);
    });
  });

  describe('Unstaking', function () {
    beforeEach(async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    });

    it('Should allow unstaking after lock period', async function () {
      await time.increase(MIN_LOCK_PERIOD + 1);

      const balanceBefore = await voiceToken.balanceOf(user1.address);
      await voiceStaking.connect(user1).unstake(STAKE_AMOUNT);
      const balanceAfter = await voiceToken.balanceOf(user1.address);

      expect(balanceAfter.sub(balanceBefore)).to.equal(STAKE_AMOUNT);
      expect(await voiceStaking.totalStaked()).to.equal(0);
    });

    it('Should apply early withdrawal penalty', async function () {
      const balanceBefore = await voiceToken.balanceOf(user1.address);
      
      const tx = await voiceStaking.connect(user1).unstake(STAKE_AMOUNT);
      await expect(tx).to.emit(voiceStaking, 'EarlyWithdrawalPenalty');

      const balanceAfter = await voiceToken.balanceOf(user1.address);
      const penalty = STAKE_AMOUNT.mul(1000).div(10000);
      expect(balanceAfter.sub(balanceBefore)).to.equal(STAKE_AMOUNT.sub(penalty));
    });

    it('Should allow partial unstaking', async function () {
      await time.increase(MIN_LOCK_PERIOD + 1);

      const partialAmount = STAKE_AMOUNT.div(2);
      await voiceStaking.connect(user1).unstake(partialAmount);

      const stakeInfo = await voiceStaking.stakes(user1.address);
      expect(stakeInfo.amount).to.equal(STAKE_AMOUNT.sub(partialAmount));
    });

    it('Should revert on zero amount', async function () {
      await expect(
        voiceStaking.connect(user1).unstake(0)
      ).to.be.revertedWithCustomError(voiceStaking, 'ZeroAmount');
    });

    it('Should revert on insufficient stake', async function () {
      const tooMuch = STAKE_AMOUNT.add(ethers.utils.parseEther('1'));
      await expect(
        voiceStaking.connect(user1).unstake(tooMuch)
      ).to.be.revertedWithCustomError(voiceStaking, 'InsufficientStake');
    });

    it('Should emit Unstaked event', async function () {
      await time.increase(MIN_LOCK_PERIOD + 1);

      await expect(voiceStaking.connect(user1).unstake(STAKE_AMOUNT))
        .to.emit(voiceStaking, 'Unstaked')
        .withArgs(user1.address, STAKE_AMOUNT, 0);
    });
  });

  describe('Reward Distribution', function () {
    beforeEach(async function () {
      await voiceToken.connect(rewardsManager).approve(voiceStaking.address, REWARD_AMOUNT);
      await voiceStaking.connect(rewardsManager).depositRewards(REWARD_AMOUNT);

      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    });

    it('Should deposit rewards correctly', async function () {
      const balance = await voiceToken.balanceOf(voiceStaking.address);
      expect(balance).to.be.gte(REWARD_AMOUNT);
    });

    it('Should accrue rewards over time', async function () {
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      const pending = await voiceStaking.getPendingRewards(user1.address);
      expect(pending).to.be.gt(0);
    });

    it('Should allow claiming rewards', async function () {
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      const pendingBefore = await voiceStaking.getPendingRewards(user1.address);
      const balanceBefore = await voiceToken.balanceOf(user1.address);

      await voiceStaking.connect(user1).claimRewards();

      const balanceAfter = await voiceToken.balanceOf(user1.address);
      expect(balanceAfter.sub(balanceBefore)).to.be.closeTo(pendingBefore, ethers.utils.parseEther('0.1'));
    });

    it('Should calculate rewards correctly for multiple stakers', async function () {
      await voiceToken.connect(user2).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user2).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);

      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      const pending1 = await voiceStaking.getPendingRewards(user1.address);
      const pending2 = await voiceStaking.getPendingRewards(user2.address);

      expect(pending1).to.be.gt(pending2);
    });

    it('Should emit RewardClaimed event', async function () {
      await ethers.provider.send('evm_mine', []);
      
      const pending = await voiceStaking.getPendingRewards(user1.address);
      
      await expect(voiceStaking.connect(user1).claimRewards())
        .to.emit(voiceStaking, 'RewardClaimed');
    });

    it('Should revert claiming when no rewards', async function () {
      await expect(
        voiceStaking.connect(user3).claimRewards()
      ).to.be.revertedWithCustomError(voiceStaking, 'NoRewardsToClaim');
    });

    it('Should include rewards when unstaking', async function () {
      await ethers.provider.send('evm_mine', []);
      await ethers.provider.send('evm_mine', []);

      await time.increase(MIN_LOCK_PERIOD + 1);

      const balanceBefore = await voiceToken.balanceOf(user1.address);
      await voiceStaking.connect(user1).unstake(STAKE_AMOUNT);
      const balanceAfter = await voiceToken.balanceOf(user1.address);

      expect(balanceAfter.sub(balanceBefore)).to.be.gt(STAKE_AMOUNT);
    });
  });

  describe('Emergency Withdrawal', function () {
    beforeEach(async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    });

    it('Should allow requesting emergency withdrawal', async function () {
      await expect(voiceStaking.connect(user1).requestEmergencyWithdrawal())
        .to.emit(voiceStaking, 'EmergencyWithdrawalRequested');

      const requestTime = await voiceStaking.emergencyWithdrawalRequests(user1.address);
      expect(requestTime).to.be.gt(0);
    });

    it('Should execute emergency withdrawal after delay', async function () {
      await voiceStaking.connect(user1).requestEmergencyWithdrawal();
      
      const delay = await voiceStaking.emergencyWithdrawalDelay();
      await time.increase(delay.toNumber());

      const balanceBefore = await voiceToken.balanceOf(user1.address);
      
      await expect(voiceStaking.connect(user1).executeEmergencyWithdrawal())
        .to.emit(voiceStaking, 'EmergencyWithdrawalExecuted')
        .withArgs(user1.address, STAKE_AMOUNT);

      const balanceAfter = await voiceToken.balanceOf(user1.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(STAKE_AMOUNT);
    });

    it('Should revert if delay not passed', async function () {
      await voiceStaking.connect(user1).requestEmergencyWithdrawal();

      await expect(
        voiceStaking.connect(user1).executeEmergencyWithdrawal()
      ).to.be.revertedWithCustomError(voiceStaking, 'EmergencyWithdrawalNotReady');
    });

    it('Should revert if no request exists', async function () {
      await expect(
        voiceStaking.connect(user1).executeEmergencyWithdrawal()
      ).to.be.revertedWithCustomError(voiceStaking, 'NoEmergencyRequest');
    });

    it('Should clear stake after emergency withdrawal', async function () {
      await voiceStaking.connect(user1).requestEmergencyWithdrawal();
      const delay = await voiceStaking.emergencyWithdrawalDelay();
      await time.increase(delay.toNumber());

      await voiceStaking.connect(user1).executeEmergencyWithdrawal();

      const stakeInfo = await voiceStaking.stakes(user1.address);
      expect(stakeInfo.amount).to.equal(0);
    });

    it('Should revert request if no stake', async function () {
      await expect(
        voiceStaking.connect(user3).requestEmergencyWithdrawal()
      ).to.be.revertedWithCustomError(voiceStaking, 'InsufficientStake');
    });
  });

  describe('Chain Reward Configuration', function () {
    it('Should allow admin to update chain config', async function () {
      const chainId = 1;
      const rewardRate = ethers.utils.parseEther('0.02');
      const minStakePeriod = 14 * 24 * 60 * 60;
      const penalty = 2000;

      await expect(
        voiceStaking.connect(admin).updateChainRewardConfig(
          chainId,
          rewardRate,
          minStakePeriod,
          penalty,
          true
        )
      ).to.emit(voiceStaking, 'RewardConfigUpdated')
        .withArgs(chainId, rewardRate, minStakePeriod, penalty);

      const config = await voiceStaking.chainRewardConfigs(chainId);
      expect(config.rewardRate).to.equal(rewardRate);
      expect(config.minStakePeriod).to.equal(minStakePeriod);
      expect(config.earlyWithdrawalPenalty).to.equal(penalty);
      expect(config.enabled).to.be.true;
    });

    it('Should revert if penalty too high', async function () {
      await expect(
        voiceStaking.connect(admin).updateChainRewardConfig(1, 1e16, MIN_LOCK_PERIOD, 6000, true)
      ).to.be.revertedWithCustomError(voiceStaking, 'InvalidPenalty');
    });

    it('Should revert if not admin', async function () {
      await expect(
        voiceStaking.connect(user1).updateChainRewardConfig(1, 1e16, MIN_LOCK_PERIOD, 1000, true)
      ).to.be.reverted;
    });

    it('Should allow disabling chain config', async function () {
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await voiceStaking.connect(admin).updateChainRewardConfig(
        chainId,
        1e16,
        MIN_LOCK_PERIOD,
        1000,
        false
      );

      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await expect(
        voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD)
      ).to.be.revertedWithCustomError(voiceStaking, 'ChainConfigDisabled');
    });
  });

  describe('View Functions', function () {
    beforeEach(async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    });

    it('Should return correct stake info', async function () {
      const info = await voiceStaking.getStakeInfo(user1.address);
      
      expect(info.amount).to.equal(STAKE_AMOUNT);
      expect(info.lockPeriod).to.equal(MIN_LOCK_PERIOD);
      expect(info.unlockTime).to.be.gt(0);
      expect(info.chainId).to.equal(await ethers.provider.getNetwork().then(n => n.chainId));
    });

    it('Should estimate APY', async function () {
      const apy = await voiceStaking.estimateAPY(MIN_LOCK_PERIOD);
      expect(apy).to.be.gt(0);
    });

    it('Should return zero APY when no stakes', async function () {
      const VoiceStakingFactory = await ethers.getContractFactory('VoiceStaking');
      const newStaking = await VoiceStakingFactory.deploy(voiceToken.address, admin.address);
      
      const apy = await newStaking.estimateAPY(MIN_LOCK_PERIOD);
      expect(apy).to.equal(0);
    });
  });

  describe('Pause Functionality', function () {
    it('Should allow emergency role to pause', async function () {
      await voiceStaking.connect(admin).pause();
      expect(await voiceStaking.paused()).to.be.true;
    });

    it('Should prevent staking when paused', async function () {
      await voiceStaking.connect(admin).pause();

      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await expect(
        voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD)
      ).to.be.revertedWith('Pausable: paused');
    });

    it('Should allow unpausing', async function () {
      await voiceStaking.connect(admin).pause();
      await voiceStaking.connect(admin).unpause();
      expect(await voiceStaking.paused()).to.be.false;
    });

    it('Should revert pause if not emergency role', async function () {
      await expect(voiceStaking.connect(user1).pause()).to.be.reverted;
    });
  });

  describe('Reentrancy Protection', function () {
    it('Should protect stake function', async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT.mul(2));
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
    });

    it('Should protect unstake function', async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
      await time.increase(MIN_LOCK_PERIOD + 1);
      await voiceStaking.connect(user1).unstake(STAKE_AMOUNT);
    });

    it('Should protect claimRewards function', async function () {
      await voiceToken.connect(user1).approve(voiceStaking.address, STAKE_AMOUNT);
      await voiceStaking.connect(user1).stake(STAKE_AMOUNT, MIN_LOCK_PERIOD);
      await ethers.provider.send('evm_mine', []);
      await voiceToken.connect(rewardsManager).approve(voiceStaking.address, REWARD_AMOUNT);
      await voiceStaking.connect(rewardsManager).depositRewards(REWARD_AMOUNT);
      await ethers.provider.send('evm_mine', []);
    });
  });

  describe('Access Control', function () {
    it('Should restrict depositRewards to REWARDS_MANAGER_ROLE', async function () {
      await expect(
        voiceStaking.connect(user1).depositRewards(ethers.utils.parseEther('100'))
      ).to.be.reverted;
    });

    it('Should allow REWARDS_MANAGER_ROLE to deposit rewards', async function () {
      await voiceToken.connect(rewardsManager).approve(voiceStaking.address, REWARD_AMOUNT);
      await expect(voiceStaking.connect(rewardsManager).depositRewards(REWARD_AMOUNT))
        .to.emit(voiceStaking, 'RewardDeposited');
    });

    it('Should restrict emergency delay changes to admin', async function () {
      await expect(
        voiceStaking.connect(user1).setEmergencyWithdrawalDelay(14 * 24 * 60 * 60)
      ).to.be.reverted;
    });

    it('Should allow admin to change emergency delay', async function () {
      const newDelay = 14 * 24 * 60 * 60;
      await voiceStaking.connect(admin).setEmergencyWithdrawalDelay(newDelay);
      expect(await voiceStaking.emergencyWithdrawalDelay()).to.equal(newDelay);
    });
  });
});
