import { ethers } from 'hardhat';

/**
 * Example configuration script for creating vesting schedules
 * Customize the schedules below to match your actual token distribution plan
 */

interface VestingConfig {
  beneficiary: string;
  tranche: number;
  amount: string;
  cliffMonths: number;
  durationMonths: number;
  revocable: boolean;
  description: string;
}

const MONTH = 30 * 24 * 60 * 60;

const VESTING_SCHEDULES: VestingConfig[] = [
  {
    beneficiary: '0xYourCommunityMultisigAddress',
    tranche: 0,
    amount: '50000000',
    cliffMonths: 0,
    durationMonths: 24,
    revocable: false,
    description: 'Community Rewards - Linear 24 months'
  },
  {
    beneficiary: '0xYourTreasuryMultisigAddress',
    tranche: 1,
    amount: '250000000',
    cliffMonths: 0,
    durationMonths: 60,
    revocable: false,
    description: 'Treasury - Linear 60 months'
  },
  {
    beneficiary: '0xYourTeamMultisigAddress',
    tranche: 2,
    amount: '200000000',
    cliffMonths: 12,
    durationMonths: 48,
    revocable: true,
    description: 'Team - 12 month cliff, 48 month vesting'
  },
  {
    beneficiary: '0xYourEcosystemMultisigAddress',
    tranche: 3,
    amount: '150000000',
    cliffMonths: 6,
    durationMonths: 36,
    revocable: false,
    description: 'Ecosystem - 6 month cliff, 36 month vesting'
  }
];

async function main() {
  console.log('Configuring Vesting Schedules...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Configuring with account:', deployer.address);

  const voiceVestingAddress = process.env.VOICE_VESTING_ADDRESS || '';
  
  if (!voiceVestingAddress || !ethers.utils.isAddress(voiceVestingAddress)) {
    throw new Error('Invalid VoiceVesting address. Set VOICE_VESTING_ADDRESS environment variable.');
  }

  const voiceVesting = await ethers.getContractAt('VoiceVesting', voiceVestingAddress);
  
  const hasAdminRole = await voiceVesting.hasRole(ethers.constants.HashZero, deployer.address);
  if (!hasAdminRole) {
    throw new Error('Deployer does not have DEFAULT_ADMIN_ROLE on VoiceVesting contract');
  }

  console.log('✅ Admin role verified\n');
  console.log('📋 Vesting Schedules to Create:\n');

  for (const [index, config] of VESTING_SCHEDULES.entries()) {
    console.log(`${index + 1}. ${config.description}`);
    console.log(`   Beneficiary: ${config.beneficiary}`);
    console.log(`   Amount: ${config.amount} VOICE`);
    console.log(`   Cliff: ${config.cliffMonths} months`);
    console.log(`   Duration: ${config.durationMonths} months`);
    console.log(`   Revocable: ${config.revocable}\n`);
  }

  console.log('⚠️  WARNING: Review the above schedules carefully before proceeding!\n');
  console.log('Proceeding in 10 seconds... (Press Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('Creating vesting schedules...\n');

  const startTime = Math.floor(Date.now() / 1000);
  const createdSchedules = [];

  for (const config of VESTING_SCHEDULES) {
    try {
      console.log(`Creating schedule: ${config.description}`);
      
      const tx = await voiceVesting.createVestingSchedule(
        config.beneficiary,
        config.tranche,
        ethers.utils.parseEther(config.amount),
        startTime,
        config.cliffMonths * MONTH,
        config.durationMonths * MONTH,
        config.revocable
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find((e) => e.event === 'VestingScheduleCreated');
      const scheduleId = event?.args?.scheduleId;

      console.log(`✅ Created schedule ID: ${scheduleId.toString()}`);
      console.log(`   Transaction: ${receipt.transactionHash}\n`);

      createdSchedules.push({
        id: scheduleId.toString(),
        ...config
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create schedule: ${config.description}`);
      console.error(`   Error: ${message}\n`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`Total schedules created: ${createdSchedules.length} / ${VESTING_SCHEDULES.length}`);

  if (createdSchedules.length > 0) {
    console.log('\n✅ Successfully created schedules:');
    for (const schedule of createdSchedules) {
      console.log(`   - Schedule ${schedule.id}: ${schedule.description}`);
    }
  }

  console.log('\n🔍 Verify schedules:');
  console.log(`Visit Etherscan and check contract at: ${voiceVestingAddress}`);
  console.log('\n💾 Save these schedule IDs for future reference!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
