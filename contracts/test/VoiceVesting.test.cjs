const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

const TOLERANCE = ethers.utils.parseEther('1');

describe('VoiceVesting', function () {
  let voiceToken;
  let voiceVesting;
  let admin;
  let beneficiary1;
  let beneficiary2;
  let revoker;
  let user1;
  let user2;

  const SUPPLY_CAP = ethers.utils.parseEther('1000000000');
  const COMMUNITY_ALLOCATION = ethers.utils.parseEther('400000000');
  const TREASURY_ALLOCATION = ethers.utils.parseEther('250000000');
  const TEAM_ALLOCATION = ethers.utils.parseEther('200000000');
  const ECOSYSTEM_ALLOCATION = ethers.utils.parseEther('150000000');

  const TIMELOCK_DELAY = 48 * 60 * 60; // 48 hours

  const TrancheType = {
    COMMUNITY: 0,
    TREASURY: 1,
    TEAM: 2,
    ECOSYSTEM: 3
  };

  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
  const REVOKER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REVOKER_ROLE'));
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));

  beforeEach(async function () {
    [admin, beneficiary1, beneficiary2, revoker, user1, user2] = await ethers.getSigners();

    const VoiceTokenFactory = await ethers.getContractFactory('VoiceToken');
    voiceToken = await VoiceTokenFactory.deploy(admin.address);
    await voiceToken.deployed();

    const VoiceVestingFactory = await ethers.getContractFactory('VoiceVesting');
    voiceVesting = await VoiceVestingFactory.deploy(voiceToken.address, admin.address);
    await voiceVesting.deployed();

    await voiceToken.connect(admin).grantRole(MINTER_ROLE, voiceVesting.address);
    await voiceVesting.connect(admin).grantRole(REVOKER_ROLE, revoker.address);
  });

  describe('Deployment', function () {
    it('Should set correct token address', async function () {
      expect(await voiceVesting.voiceToken()).to.equal(voiceToken.address);
    });

    it('Should grant DEFAULT_ADMIN_ROLE to admin', async function () {
      expect(await voiceVesting.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('Should grant REVOKER_ROLE to admin', async function () {
      expect(await voiceVesting.hasRole(REVOKER_ROLE, admin.address)).to.be.true;
    });

    it('Should set correct allocation constants', async function () {
      expect(await voiceVesting.COMMUNITY_ALLOCATION()).to.equal(COMMUNITY_ALLOCATION);
      expect(await voiceVesting.TREASURY_ALLOCATION()).to.equal(TREASURY_ALLOCATION);
      expect(await voiceVesting.TEAM_ALLOCATION()).to.equal(TEAM_ALLOCATION);
      expect(await voiceVesting.ECOSYSTEM_ALLOCATION()).to.equal(ECOSYSTEM_ALLOCATION);
      expect(await voiceVesting.TOTAL_ALLOCATION()).to.equal(SUPPLY_CAP);
    });

    it('Should set correct timelock delay', async function () {
      expect(await voiceVesting.TIMELOCK_DELAY()).to.equal(TIMELOCK_DELAY);
    });

    it('Should revert if deployed with zero token address', async function () {
      const VoiceVestingFactory = await ethers.getContractFactory('VoiceVesting');
      await expect(VoiceVestingFactory.deploy(ethers.constants.AddressZero, admin.address))
        .to.be.revertedWithCustomError(voiceVesting, 'ZeroAddress');
    });

    it('Should revert if deployed with zero admin address', async function () {
      const VoiceVestingFactory = await ethers.getContractFactory('VoiceVesting');
      await expect(VoiceVestingFactory.deploy(voiceToken.address, ethers.constants.AddressZero))
        .to.be.revertedWithCustomError(voiceVesting, 'ZeroAddress');
    });
  });

  describe('Creating Vesting Schedules', function () {
    const vestAmount = ethers.utils.parseEther('1000000');
    const duration = 365 * 24 * 60 * 60; // 1 year
    const cliff = 90 * 24 * 60 * 60; // 90 days

    it('Should create a vesting schedule successfully', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary1.address,
          TrancheType.COMMUNITY,
          vestAmount,
          startTime,
          cliff,
          duration,
          true
        )
      ).to.emit(voiceVesting, 'VestingScheduleCreated')
        .withArgs(0, beneficiary1.address, TrancheType.COMMUNITY, vestAmount, startTime, cliff, duration, true);
    });

    it('Should increment schedule ID counter', async function () {
      const startTime = await time.latest();
      
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        cliff,
        duration,
        true
      );

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary2.address,
        TrancheType.TREASURY,
        vestAmount,
        startTime,
        cliff,
        duration,
        false
      );

      const schedule1 = await voiceVesting.vestingSchedules(0);
      const schedule2 = await voiceVesting.vestingSchedules(1);

      expect(schedule1.beneficiary).to.equal(beneficiary1.address);
      expect(schedule2.beneficiary).to.equal(beneficiary2.address);
    });

    it('Should update allocated tranche amount', async function () {
      const startTime = await time.latest();
      
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        cliff,
        duration,
        true
      );

      expect(await voiceVesting.allocatedByTranche(TrancheType.COMMUNITY)).to.equal(vestAmount);
    });

    it('Should add schedule to beneficiary list', async function () {
      const startTime = await time.latest();
      
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        cliff,
        duration,
        true
      );

      const schedules = await voiceVesting.getBeneficiarySchedules(beneficiary1.address);
      expect(schedules.length).to.equal(1);
      expect(schedules[0]).to.equal(0);
    });

    it('Should use current timestamp if startTime is 0', async function () {
      const tx = await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        0,
        cliff,
        duration,
        true
      );

      const receipt = await tx.wait();
      const blockTime = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      const schedule = await voiceVesting.vestingSchedules(0);
      expect(schedule.startTime).to.equal(blockTime);
    });

    it('Should revert if beneficiary is zero address', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          ethers.constants.AddressZero,
          TrancheType.COMMUNITY,
          vestAmount,
          startTime,
          cliff,
          duration,
          true
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'ZeroAddress');
    });

    it('Should revert if amount is zero', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary1.address,
          TrancheType.COMMUNITY,
          0,
          startTime,
          cliff,
          duration,
          true
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'ZeroAmount');
    });

    it('Should revert if duration is zero', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary1.address,
          TrancheType.COMMUNITY,
          vestAmount,
          startTime,
          cliff,
          0,
          true
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'InvalidDuration');
    });

    it('Should revert if cliff is greater than duration', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary1.address,
          TrancheType.COMMUNITY,
          vestAmount,
          startTime,
          duration + 1,
          duration,
          true
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'InvalidCliff');
    });

    it('Should revert if tranche allocation is exceeded', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary1.address,
          TrancheType.COMMUNITY,
          COMMUNITY_ALLOCATION.add(1),
          startTime,
          cliff,
          duration,
          true
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'TrancheAllocationExceeded');
    });

    it('Should not allow non-admin to create schedule', async function () {
      const startTime = await time.latest();
      
      await expect(
        voiceVesting.connect(user1).createVestingSchedule(
          beneficiary1.address,
          TrancheType.COMMUNITY,
          vestAmount,
          startTime,
          cliff,
          duration,
          true
        )
      ).to.be.reverted;
    });

    it('Should allow creating schedule without cliff', async function () {
      const startTime = await time.latest();
      
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        0,
        duration,
        true
      );

      const schedule = await voiceVesting.vestingSchedules(0);
      expect(schedule.cliffDuration).to.equal(0);
    });
  });

  describe('Linear Vesting Math', function () {
    const vestAmount = ethers.utils.parseEther('120000');
    const duration = 12 * 30 * 24 * 60 * 60; // 12 months
    const cliff = 0;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TEAM,
        vestAmount,
        startTime,
        cliff,
        duration,
        true
      );
    });

    it('Should vest linearly over time', async function () {
      const schedule = await voiceVesting.vestingSchedules(0);
      
      await time.increase(30 * 24 * 60 * 60);
      const vested1Month = await voiceVesting.computeVestedAmount(0);
      expect(vested1Month).to.be.closeTo(ethers.utils.parseEther('10000'), ethers.utils.parseEther('100'));

      await time.increase(30 * 24 * 60 * 60);
      const vested2Months = await voiceVesting.computeVestedAmount(0);
      expect(vested2Months).to.be.closeTo(ethers.utils.parseEther('20000'), ethers.utils.parseEther('100'));

      await time.increase(6 * 30 * 24 * 60 * 60);
      const vested8Months = await voiceVesting.computeVestedAmount(0);
      expect(vested8Months).to.be.closeTo(ethers.utils.parseEther('80000'), ethers.utils.parseEther('100'));
    });

    it('Should vest entire amount after duration ends', async function () {
      await time.increase(duration + 1);
      
      const vested = await voiceVesting.computeVestedAmount(0);
      expect(vested).to.equal(vestAmount);
    });

    it('Should compute correct releasable amount', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const releasable = await voiceVesting.computeReleasableAmount(0);
      expect(releasable).to.be.closeTo(ethers.utils.parseEther('60000'), ethers.utils.parseEther('100'));
    });

    it('Should account for already released tokens', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await voiceVesting.connect(beneficiary1).release(0);
      
      const releasable = await voiceVesting.computeReleasableAmount(0);
      expect(releasable).to.equal(0);

      await time.increase(3 * 30 * 24 * 60 * 60);
      
      const releasableAfter = await voiceVesting.computeReleasableAmount(0);
      expect(releasableAfter).to.be.closeTo(ethers.utils.parseEther('30000'), ethers.utils.parseEther('100'));
    });
  });

  describe('Cliff Vesting', function () {
    const vestAmount = ethers.utils.parseEther('100000');
    const duration = 48 * 30 * 24 * 60 * 60; // 48 months
    const cliff = 12 * 30 * 24 * 60 * 60; // 12 months cliff

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TEAM,
        vestAmount,
        startTime,
        cliff,
        duration,
        true
      );
    });

    it('Should not vest any tokens before cliff', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const vested = await voiceVesting.computeVestedAmount(0);
      expect(vested).to.equal(0);

      const releasable = await voiceVesting.computeReleasableAmount(0);
      expect(releasable).to.equal(0);
    });

    it('Should vest linearly after cliff', async function () {
      await time.increase(cliff + 1);
      
      const vestedAtCliff = await voiceVesting.computeVestedAmount(0);
      expect(vestedAtCliff).to.be.closeTo(ethers.utils.parseEther('25000'), ethers.utils.parseEther('200'));

      await time.increase(12 * 30 * 24 * 60 * 60);
      
      const vested24Months = await voiceVesting.computeVestedAmount(0);
      expect(vested24Months).to.be.closeTo(ethers.utils.parseEther('50000'), ethers.utils.parseEther('200'));
    });

    it('Should not allow release before cliff', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await expect(
        voiceVesting.connect(beneficiary1).release(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'NoTokensVested');
    });

    it('Should allow release after cliff', async function () {
      await time.increase(cliff + 1);
      
      await voiceVesting.connect(beneficiary1).release(0);
      
      const balance = await voiceToken.balanceOf(beneficiary1.address);
      expect(balance).to.be.closeTo(ethers.utils.parseEther('25000'), ethers.utils.parseEther('200'));
    });
  });

  describe('Releasing Tokens', function () {
    const vestAmount = ethers.utils.parseEther('120000');
    const duration = 12 * 30 * 24 * 60 * 60;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        0,
        duration,
        false
      );
    });

    it('Should allow beneficiary to release vested tokens', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await expect(voiceVesting.connect(beneficiary1).release(0))
        .to.emit(voiceVesting, 'TokensReleased')
        .withArgs(0, beneficiary1.address, anyValue);

      const balance = await voiceToken.balanceOf(beneficiary1.address);
      const expected = vestAmount.div(2);
      expect(balance).to.be.closeTo(expected, TOLERANCE);
    });

    it('Should update released amount after release', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await voiceVesting.connect(beneficiary1).release(0);

      const schedule = await voiceVesting.vestingSchedules(0);
      expect(schedule.releasedAmount).to.be.gt(0);
    });

    it('Should update tranche released amount', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await voiceVesting.connect(beneficiary1).release(0);

      const released = await voiceVesting.releasedByTranche(TrancheType.COMMUNITY);
      const expected = vestAmount.div(2);
      expect(released).to.be.closeTo(expected, TOLERANCE);
    });

    it('Should revert if called by non-beneficiary', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await expect(
        voiceVesting.connect(user1).release(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'NotBeneficiary');
    });

    it('Should revert if no tokens are vested', async function () {
      const startTime = (await time.latest()) + 30 * 24 * 60 * 60;
      const amount = ethers.utils.parseEther('1000');

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        amount,
        startTime,
        0,
        12 * 30 * 24 * 60 * 60,
        false
      );

      await expect(
        voiceVesting.connect(beneficiary1).release(1)
      ).to.be.revertedWithCustomError(voiceVesting, 'NoTokensVested');
    });

    it('Should revert if schedule not found', async function () {
      await expect(
        voiceVesting.connect(beneficiary1).release(999)
      ).to.be.revertedWithCustomError(voiceVesting, 'ScheduleNotFound');
    });

    it('Should allow multiple releases over time', async function () {
      await time.increase(3 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(beneficiary1).release(0);
      const balance1 = await voiceToken.balanceOf(beneficiary1.address);

      await time.increase(3 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(beneficiary1).release(0);
      const balance2 = await voiceToken.balanceOf(beneficiary1.address);

      expect(balance2).to.be.gt(balance1);
    });
  });

  describe('Revocation', function () {
    const vestAmount = ethers.utils.parseEther('120000');
    const duration = 12 * 30 * 24 * 60 * 60;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TEAM,
        vestAmount,
        startTime,
        0,
        duration,
        true
      );
    });

    it('Should allow revoker to revoke schedule', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await expect(voiceVesting.connect(revoker).revoke(0))
        .to.emit(voiceVesting, 'VestingRevoked')
        .withArgs(0, beneficiary1.address, anyValue);

      const schedule = await voiceVesting.vestingSchedules(0);
      expect(schedule.revoked).to.be.true;
    });

    it('Should release vested tokens on revocation', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const vestedBefore = await voiceVesting.computeVestedAmount(0);
      
      await voiceVesting.connect(revoker).revoke(0);

      const balance = await voiceToken.balanceOf(beneficiary1.address);
      expect(balance).to.be.closeTo(vestedBefore, TOLERANCE);
    });

    it('Should reduce tranche allocation by unvested amount', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const allocatedBefore = await voiceVesting.allocatedByTranche(TrancheType.TEAM);
      const vestedAmount = await voiceVesting.computeVestedAmount(0);
      const unvested = vestAmount.sub(vestedAmount);

      await voiceVesting.connect(revoker).revoke(0);

      const allocatedAfter = await voiceVesting.allocatedByTranche(TrancheType.TEAM);
      expect(allocatedBefore.sub(allocatedAfter)).to.be.closeTo(unvested, TOLERANCE);
    });

    it('Should prevent release after revocation', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(revoker).revoke(0);

      await time.increase(6 * 30 * 24 * 60 * 60);

      const releasable = await voiceVesting.computeReleasableAmount(0);
      expect(releasable).to.equal(0);
    });

    it('Should revert if schedule is not revocable', async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary2.address,
        TrancheType.TREASURY,
        vestAmount,
        startTime,
        0,
        duration,
        false
      );

      await expect(
        voiceVesting.connect(revoker).revoke(1)
      ).to.be.revertedWithCustomError(voiceVesting, 'NotRevocable');
    });

    it('Should revert if already revoked', async function () {
      await voiceVesting.connect(revoker).revoke(0);

      await expect(
        voiceVesting.connect(revoker).revoke(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'AlreadyRevoked');
    });

    it('Should revert if called by non-revoker', async function () {
      await expect(
        voiceVesting.connect(user1).revoke(0)
      ).to.be.reverted;
    });
  });

  describe('Beneficiary Updates with Timelock', function () {
    const vestAmount = ethers.utils.parseEther('100000');
    const duration = 12 * 30 * 24 * 60 * 60;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.ECOSYSTEM,
        vestAmount,
        startTime,
        0,
        duration,
        false
      );
    });

    it('Should schedule beneficiary update', async function () {
      const tx = await voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address);
      const receipt = await tx.wait();
      const blockTime = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
      const effectiveTime = blockTime + TIMELOCK_DELAY;

      await expect(tx)
        .to.emit(voiceVesting, 'BeneficiaryUpdateScheduled')
        .withArgs(0, beneficiary1.address, beneficiary2.address, effectiveTime);

      const update = await voiceVesting.pendingBeneficiaryUpdates(0);
      expect(update.newBeneficiary).to.equal(beneficiary2.address);
      expect(update.effectiveTime).to.equal(effectiveTime);
      expect(update.executed).to.be.false;
    });

    it('Should execute beneficiary update after timelock', async function () {
      await voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address);
      
      await time.increase(TIMELOCK_DELAY + 1);

      await expect(voiceVesting.connect(user1).executeBeneficiaryUpdate(0))
        .to.emit(voiceVesting, 'BeneficiaryUpdated')
        .withArgs(0, beneficiary1.address, beneficiary2.address);

      const schedule = await voiceVesting.vestingSchedules(0);
      expect(schedule.beneficiary).to.equal(beneficiary2.address);
    });

    it('Should update beneficiary schedule lists', async function () {
      await voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address);
      await time.increase(TIMELOCK_DELAY + 1);
      await voiceVesting.connect(user1).executeBeneficiaryUpdate(0);

      const schedules1 = await voiceVesting.getBeneficiarySchedules(beneficiary1.address);
      const schedules2 = await voiceVesting.getBeneficiarySchedules(beneficiary2.address);

      expect(schedules1.length).to.equal(0);
      expect(schedules2.length).to.equal(1);
      expect(schedules2[0]).to.equal(0);
    });

    it('Should revert execution before timelock expires', async function () {
      await voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address);

      await expect(
        voiceVesting.connect(user1).executeBeneficiaryUpdate(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'TimelockNotExpired');

      await time.increase(TIMELOCK_DELAY - 100);

      await expect(
        voiceVesting.connect(user1).executeBeneficiaryUpdate(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'TimelockNotExpired');
    });

    it('Should revert if no pending update exists', async function () {
      await expect(
        voiceVesting.connect(user1).executeBeneficiaryUpdate(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'NoPendingBeneficiaryUpdate');
    });

    it('Should revert if update already executed', async function () {
      await voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address);
      await time.increase(TIMELOCK_DELAY + 1);
      await voiceVesting.connect(user1).executeBeneficiaryUpdate(0);

      await expect(
        voiceVesting.connect(user1).executeBeneficiaryUpdate(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'BeneficiaryUpdateAlreadyExecuted');
    });

    it('Should revert schedule update for zero address', async function () {
      await expect(
        voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(voiceVesting, 'ZeroAddress');
    });

    it('Should revert schedule update for revoked schedule', async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TEAM,
        vestAmount,
        startTime,
        0,
        duration,
        true
      );

      await voiceVesting.connect(revoker).revoke(1);

      await expect(
        voiceVesting.connect(admin).scheduleBeneficiaryUpdate(1, beneficiary2.address)
      ).to.be.revertedWithCustomError(voiceVesting, 'AlreadyRevoked');
    });

    it('Should not allow non-admin to schedule update', async function () {
      await expect(
        voiceVesting.connect(user1).scheduleBeneficiaryUpdate(0, beneficiary2.address)
      ).to.be.reverted;
    });

    it('Should allow new beneficiary to release after update', async function () {
      await voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address);
      await time.increase(TIMELOCK_DELAY + 1);
      await voiceVesting.connect(user1).executeBeneficiaryUpdate(0);

      await time.increase(6 * 30 * 24 * 60 * 60);

      await voiceVesting.connect(beneficiary2).release(0);
      const balance = await voiceToken.balanceOf(beneficiary2.address);
      expect(balance).to.be.gt(0);
    });
  });

  describe('Emergency Pause', function () {
    const vestAmount = ethers.utils.parseEther('100000');
    const duration = 12 * 30 * 24 * 60 * 60;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        0,
        duration,
        true
      );
    });

    it('Should allow admin to pause', async function () {
      await expect(voiceVesting.connect(admin).emergencyPause('Security incident'))
        .to.emit(voiceVesting, 'EmergencyPause')
        .withArgs(admin.address, 'Security incident');

      expect(await voiceVesting.paused()).to.be.true;
    });

    it('Should allow admin to unpause', async function () {
      await voiceVesting.connect(admin).emergencyPause('Test pause');
      
      await expect(voiceVesting.connect(admin).emergencyUnpause())
        .to.emit(voiceVesting, 'EmergencyUnpause')
        .withArgs(admin.address);

      expect(await voiceVesting.paused()).to.be.false;
    });

    it('Should prevent creating schedules when paused', async function () {
      await voiceVesting.connect(admin).emergencyPause('Test pause');

      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary2.address,
          TrancheType.TREASURY,
          vestAmount,
          0,
          0,
          duration,
          false
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'EnforcedPause');
    });

    it('Should prevent releasing tokens when paused', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(admin).emergencyPause('Test pause');

      await expect(
        voiceVesting.connect(beneficiary1).release(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'EnforcedPause');
    });

    it('Should prevent revocation when paused', async function () {
      await voiceVesting.connect(admin).emergencyPause('Test pause');

      await expect(
        voiceVesting.connect(revoker).revoke(0)
      ).to.be.revertedWithCustomError(voiceVesting, 'EnforcedPause');
    });

    it('Should prevent beneficiary updates when paused', async function () {
      await voiceVesting.connect(admin).emergencyPause('Test pause');

      await expect(
        voiceVesting.connect(admin).scheduleBeneficiaryUpdate(0, beneficiary2.address)
      ).to.be.revertedWithCustomError(voiceVesting, 'EnforcedPause');
    });

    it('Should not allow non-admin to pause', async function () {
      await expect(
        voiceVesting.connect(user1).emergencyPause('Unauthorized')
      ).to.be.reverted;
    });

    it('Should not allow non-admin to unpause', async function () {
      await voiceVesting.connect(admin).emergencyPause('Test pause');

      await expect(
        voiceVesting.connect(user1).emergencyUnpause()
      ).to.be.reverted;
    });

    it('Should allow operations after unpause', async function () {
      await voiceVesting.connect(admin).emergencyPause('Test pause');
      await voiceVesting.connect(admin).emergencyUnpause();

      await time.increase(6 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(beneficiary1).release(0);

      const balance = await voiceToken.balanceOf(beneficiary1.address);
      expect(balance).to.be.gt(0);
    });
  });

  describe('Tranche Allocations', function () {
    it('Should track allocations per tranche', async function () {
      const startTime = await time.latest();
      const duration = 12 * 30 * 24 * 60 * 60;

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        ethers.utils.parseEther('10000000'),
        startTime,
        0,
        duration,
        false
      );

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary2.address,
        TrancheType.TEAM,
        ethers.utils.parseEther('5000000'),
        startTime,
        0,
        duration,
        false
      );

      expect(await voiceVesting.allocatedByTranche(TrancheType.COMMUNITY))
        .to.equal(ethers.utils.parseEther('10000000'));
      expect(await voiceVesting.allocatedByTranche(TrancheType.TEAM))
        .to.equal(ethers.utils.parseEther('5000000'));
    });

    it('Should return correct remaining allocation', async function () {
      const startTime = await time.latest();
      const duration = 12 * 30 * 24 * 60 * 60;
      const allocated = ethers.utils.parseEther('50000000');

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TREASURY,
        allocated,
        startTime,
        0,
        duration,
        false
      );

      const remaining = await voiceVesting.getRemainingAllocation(TrancheType.TREASURY);
      expect(remaining).to.equal(TREASURY_ALLOCATION.sub(allocated));
    });

    it('Should enforce allocation caps per tranche', async function () {
      const startTime = await time.latest();
      const duration = 12 * 30 * 24 * 60 * 60;

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.ECOSYSTEM,
        ECOSYSTEM_ALLOCATION,
        startTime,
        0,
        duration,
        false
      );

      await expect(
        voiceVesting.connect(admin).createVestingSchedule(
          beneficiary2.address,
          TrancheType.ECOSYSTEM,
          ethers.utils.parseEther('1'),
          startTime,
          0,
          duration,
          false
        )
      ).to.be.revertedWithCustomError(voiceVesting, 'TrancheAllocationExceeded');
    });
  });

  describe('VoiceToken Integration', function () {
    const vestAmount = ethers.utils.parseEther('100000');
    const duration = 12 * 30 * 24 * 60 * 60;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        0,
        duration,
        false
      );
    });

    it('Should mint tokens from VoiceToken on release', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await voiceVesting.connect(beneficiary1).release(0);

      const expected = vestAmount.div(2);
      const balance = await voiceToken.balanceOf(beneficiary1.address);
      const supply = await voiceToken.totalSupply();
      
      expect(balance).to.be.closeTo(expected, TOLERANCE);
      expect(supply).to.be.closeTo(expected, TOLERANCE);
    });

    it('Should respect VoiceToken supply cap', async function () {
      const startTime = await time.latest();
      
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary2.address,
        TrancheType.TREASURY,
        TREASURY_ALLOCATION,
        startTime,
        0,
        duration,
        false
      );

      await voiceVesting.connect(admin).createVestingSchedule(
        user1.address,
        TrancheType.TEAM,
        TEAM_ALLOCATION,
        startTime,
        0,
        duration,
        false
      );

      await voiceVesting.connect(admin).createVestingSchedule(
        user2.address,
        TrancheType.ECOSYSTEM,
        ECOSYSTEM_ALLOCATION,
        startTime,
        0,
        duration,
        false
      );

      const totalAllocated = 
        vestAmount.add(TREASURY_ALLOCATION).add(TEAM_ALLOCATION).add(ECOSYSTEM_ALLOCATION);
      
      expect(totalAllocated).to.be.lte(SUPPLY_CAP);
    });

    it('Should require MINTER_ROLE on VoiceToken', async function () {
      await voiceToken.connect(admin).revokeRole(MINTER_ROLE, voiceVesting.address);
      
      await time.increase(6 * 30 * 24 * 60 * 60);

      await expect(
        voiceVesting.connect(beneficiary1).release(0)
      ).to.be.reverted;
    });
  });

  describe('View Functions', function () {
    const vestAmount = ethers.utils.parseEther('120000');
    const duration = 12 * 30 * 24 * 60 * 60;

    beforeEach(async function () {
      const startTime = await time.latest();
      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        vestAmount,
        startTime,
        0,
        duration,
        false
      );

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TREASURY,
        ethers.utils.parseEther('50000'),
        startTime,
        0,
        duration,
        false
      );
    });

    it('Should return beneficiary schedules', async function () {
      const schedules = await voiceVesting.getBeneficiarySchedules(beneficiary1.address);
      expect(schedules.length).to.equal(2);
      expect(schedules[0]).to.equal(0);
      expect(schedules[1]).to.equal(1);
    });

    it('Should return vesting statistics', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await voiceVesting.connect(beneficiary1).release(0);

      const stats = await voiceVesting.getVestingStats();
      expect(stats.totalAllocated).to.equal(vestAmount.add(ethers.utils.parseEther('50000')));
      expect(stats.totalReleased).to.be.gt(0);
      expect(stats.totalVested).to.be.gt(0);
      expect(stats.totalUnvested).to.be.gt(0);
    });

    it('Should compute vested amount correctly', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const vested = await voiceVesting.computeVestedAmount(0);
      expect(vested).to.be.closeTo(ethers.utils.parseEther('60000'), ethers.utils.parseEther('100'));
    });

    it('Should compute releasable amount correctly', async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const releasable = await voiceVesting.computeReleasableAmount(0);
      expect(releasable).to.be.closeTo(ethers.utils.parseEther('60000'), ethers.utils.parseEther('100'));
    });
  });

  describe('Multiple Schedules and Complex Scenarios', function () {
    it('Should handle multiple beneficiaries with different schedules', async function () {
      const startTime = await time.latest();
      const duration = 12 * 30 * 24 * 60 * 60;

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.COMMUNITY,
        ethers.utils.parseEther('100000'),
        startTime,
        0,
        duration,
        false
      );

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary2.address,
        TrancheType.TEAM,
        ethers.utils.parseEther('50000'),
        startTime,
        6 * 30 * 24 * 60 * 60,
        duration,
        true
      );

      await time.increase(3 * 30 * 24 * 60 * 60);

      const releasable1 = await voiceVesting.computeReleasableAmount(0);
      const releasable2 = await voiceVesting.computeReleasableAmount(1);

      expect(releasable1).to.be.gt(0);
      expect(releasable2).to.equal(0);
    });

    it('Should handle full lifecycle: create, release, revoke', async function () {
      const startTime = await time.latest();
      const duration = 12 * 30 * 24 * 60 * 60;
      const amount = ethers.utils.parseEther('120000');

      await voiceVesting.connect(admin).createVestingSchedule(
        beneficiary1.address,
        TrancheType.TEAM,
        amount,
        startTime,
        0,
        duration,
        true
      );

      await time.increase(3 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(beneficiary1).release(0);
      const balance1 = await voiceToken.balanceOf(beneficiary1.address);

      await time.increase(3 * 30 * 24 * 60 * 60);
      await voiceVesting.connect(revoker).revoke(0);
      const balance2 = await voiceToken.balanceOf(beneficiary1.address);

      expect(balance2).to.be.gt(balance1);
      expect(balance2).to.be.lt(amount);

      const schedule = await voiceVesting.vestingSchedules(0);
      expect(schedule.revoked).to.be.true;
    });
  });
});
