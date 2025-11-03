// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVoiceVotingToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/**
 * @title VoiceStaking
 * @notice VOICE staking contract enabling reward accrual, vote delegation, and multi-chain aware configuration
 * @dev Designed to interface with an off-chain RewardEngine and VoiceGovernor by minting a non-transferable voting token
 */
contract VoiceStaking is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");
    bytes32 public constant CONFIG_MANAGER_ROLE = keccak256("CONFIG_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_MANAGER_ROLE = keccak256("EMERGENCY_MANAGER_ROLE");

    uint256 private constant PRECISION = 1e18;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable voiceToken;
    IVoiceVotingToken public votingToken;

    uint256 public totalStaked;
    bool public emergencyMode;
    uint256 public emergencyWithdrawalDelay = 2 days;

    struct StakePosition {
        uint256 amount;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
        uint256 unlockTimestamp;
    }

    struct ChainParameters {
        uint256 minLockDuration;
        uint256 maxLockDuration;
        uint256 earlyUnstakePenaltyBps;
        bool active;
    }

    struct EmissionState {
        uint256 rewardRate; // tokens per second
        uint256 rewardPerTokenStored;
        uint256 lastUpdateTime;
        uint256 periodFinish;
    }

    mapping(address => StakePosition) private _stakes;
    mapping(address => uint256) public emergencyWithdrawalRequestedAt;
    mapping(uint256 => ChainParameters) private _chainParameters;
    mapping(uint256 => EmissionState) private _emissions;

    event Staked(address indexed account, uint256 amount, uint256 unlockTimestamp);
    event Unstaked(address indexed account, uint256 amount, uint256 penaltyAmount);
    event RewardsClaimed(address indexed account, uint256 reward);
    event RewardScheduleUpdated(
        uint256 indexed chainId,
        uint256 amount,
        uint256 duration,
        uint256 rewardRate,
        uint256 periodFinish
    );
    event ChainParametersUpdated(
        uint256 indexed chainId,
        uint256 minLockDuration,
        uint256 maxLockDuration,
        uint256 earlyUnstakePenaltyBps,
        bool active
    );
    event VotingTokenConfigured(address indexed votingToken);
    event EmergencyModeUpdated(bool enabled, uint256 withdrawalDelay);
    event EmergencyWithdrawalRequested(address indexed account, uint256 availableAt);
    event EmergencyWithdrawalExecuted(address indexed account, uint256 amount);
    event EarlyUnstakePenaltyApplied(address indexed account, uint256 penaltyAmount);

    error ZeroAddress();
    error ZeroAmount();
    error ChainInactive(uint256 chainId);
    error LockTooShort(uint256 provided, uint256 required);
    error LockTooLong(uint256 provided, uint256 maximum);
    error VotingTokenNotConfigured();
    error VotingTokenAlreadyConfigured();
    error InsufficientStake();
    error NoRewardsToClaim();
    error StakeLocked(uint256 unlockTimestamp);
    error EmergencyNotEnabled();
    error EmergencyNotRequested();
    error EmergencyCooldownActive(uint256 readyAt);
    error InvalidPenaltyBps(uint256 provided);

    constructor(
        address voiceTokenAddress,
        address admin,
        uint256 minLockDuration,
        uint256 maxLockDuration,
        uint256 earlyUnstakePenaltyBps
    ) {
        if (voiceTokenAddress == address(0) || admin == address(0)) revert ZeroAddress();
        if (earlyUnstakePenaltyBps > BPS_DENOMINATOR) revert InvalidPenaltyBps(earlyUnstakePenaltyBps);
        if (maxLockDuration != 0 && maxLockDuration < minLockDuration) revert LockTooLong(minLockDuration, maxLockDuration);

        voiceToken = IERC20(voiceTokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REWARDS_MANAGER_ROLE, admin);
        _grantRole(CONFIG_MANAGER_ROLE, admin);
        _grantRole(EMERGENCY_MANAGER_ROLE, admin);

        uint256 chainId = block.chainid;
        _chainParameters[chainId] = ChainParameters({
            minLockDuration: minLockDuration,
            maxLockDuration: maxLockDuration,
            earlyUnstakePenaltyBps: earlyUnstakePenaltyBps,
            active: true
        });

        _emissions[chainId].lastUpdateTime = block.timestamp;
    }

    // -------------------------------------------------------------------------
    // Staking logic
    // -------------------------------------------------------------------------

    function stake(uint256 amount, uint256 lockDuration) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 chainId = block.chainid;
        ChainParameters memory params = _chainParameters[chainId];
        if (!params.active) revert ChainInactive(chainId);
        if (params.minLockDuration > 0 && lockDuration < params.minLockDuration) {
            revert LockTooShort(lockDuration, params.minLockDuration);
        }
        if (params.maxLockDuration > 0 && lockDuration > params.maxLockDuration) {
            revert LockTooLong(lockDuration, params.maxLockDuration);
        }
        if (address(votingToken) == address(0)) revert VotingTokenNotConfigured();

        _updateReward(msg.sender);

        voiceToken.safeTransferFrom(msg.sender, address(this), amount);

        StakePosition storage position = _stakes[msg.sender];
        position.amount += amount;

        uint256 unlockTimestamp = block.timestamp + lockDuration;
        if (unlockTimestamp > position.unlockTimestamp) {
            position.unlockTimestamp = unlockTimestamp;
        }

        totalStaked += amount;

        votingToken.mint(msg.sender, amount);

        emit Staked(msg.sender, amount, position.unlockTimestamp);
    }

    function unstake(uint256 amount) public nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        _updateReward(msg.sender);

        StakePosition storage position = _stakes[msg.sender];
        if (position.amount < amount) revert InsufficientStake();

        uint256 penalty;
        uint256 chainId = block.chainid;
        ChainParameters memory params = _chainParameters[chainId];
        if (block.timestamp < position.unlockTimestamp) {
            if (params.earlyUnstakePenaltyBps == 0) {
                revert StakeLocked(position.unlockTimestamp);
            }
            penalty = (amount * params.earlyUnstakePenaltyBps) / BPS_DENOMINATOR;
            emit EarlyUnstakePenaltyApplied(msg.sender, penalty);
        }

        position.amount -= amount;
        totalStaked -= amount;

        votingToken.burn(msg.sender, amount);

        uint256 payout = amount - penalty;
        voiceToken.safeTransfer(msg.sender, payout);

        uint256 reward = position.rewards;
        if (reward > 0) {
            position.rewards = 0;
            voiceToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }

        emit Unstaked(msg.sender, payout, penalty);
    }

    function exit() external {
        StakePosition storage position = _stakes[msg.sender];
        uint256 balance = position.amount;
        if (balance == 0) revert InsufficientStake();
        unstake(balance);
    }

    function claimRewards() external nonReentrant whenNotPaused {
        _updateReward(msg.sender);

        StakePosition storage position = _stakes[msg.sender];
        uint256 reward = position.rewards;
        if (reward == 0) revert NoRewardsToClaim();

        position.rewards = 0;
        voiceToken.safeTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    // -------------------------------------------------------------------------
    // Reward management
    // -------------------------------------------------------------------------

    function notifyRewardAmount(uint256 amount, uint256 duration) external nonReentrant onlyRole(REWARDS_MANAGER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (duration == 0) revert ZeroAmount();

        uint256 chainId = block.chainid;
        _updateReward(address(0));

        voiceToken.safeTransferFrom(msg.sender, address(this), amount);

        EmissionState storage emission = _emissions[chainId];
        if (block.timestamp >= emission.periodFinish) {
            emission.rewardRate = amount / duration;
        } else {
            uint256 remaining = emission.periodFinish - block.timestamp;
            uint256 leftover = remaining * emission.rewardRate;
            emission.rewardRate = (amount + leftover) / duration;
        }

        emission.lastUpdateTime = block.timestamp;
        emission.periodFinish = block.timestamp + duration;

        emit RewardScheduleUpdated(chainId, amount, duration, emission.rewardRate, emission.periodFinish);
    }

    // -------------------------------------------------------------------------
    // Emergency withdrawal
    // -------------------------------------------------------------------------

    function requestEmergencyWithdrawal() external whenNotPaused {
        if (!emergencyMode) revert EmergencyNotEnabled();

        StakePosition storage position = _stakes[msg.sender];
        if (position.amount == 0) revert InsufficientStake();

        uint256 availableAt = block.timestamp + emergencyWithdrawalDelay;
        emergencyWithdrawalRequestedAt[msg.sender] = availableAt;

        emit EmergencyWithdrawalRequested(msg.sender, availableAt);
    }

    function executeEmergencyWithdrawal() external nonReentrant {
        if (!emergencyMode) revert EmergencyNotEnabled();

        uint256 readyAt = emergencyWithdrawalRequestedAt[msg.sender];
        if (readyAt == 0) revert EmergencyNotRequested();
        if (block.timestamp < readyAt) revert EmergencyCooldownActive(readyAt);

        _updateReward(msg.sender);

        StakePosition storage position = _stakes[msg.sender];
        uint256 amount = position.amount;
        if (amount == 0) revert InsufficientStake();

        totalStaked -= amount;
        position.amount = 0;
        position.rewards = 0;
        position.rewardPerTokenPaid = _emissions[block.chainid].rewardPerTokenStored;
        position.unlockTimestamp = 0;

        delete emergencyWithdrawalRequestedAt[msg.sender];

        if (address(votingToken) != address(0)) {
            votingToken.burn(msg.sender, amount);
        }

        voiceToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdrawalExecuted(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Configuration & administration
    // -------------------------------------------------------------------------

    function setVotingToken(address votingTokenAddress) external onlyRole(CONFIG_MANAGER_ROLE) {
        if (votingTokenAddress == address(0)) revert ZeroAddress();
        if (address(votingToken) != address(0)) revert VotingTokenAlreadyConfigured();

        votingToken = IVoiceVotingToken(votingTokenAddress);
        emit VotingTokenConfigured(votingTokenAddress);
    }

    function setChainParameters(
        uint256 chainId,
        uint256 minLockDuration,
        uint256 maxLockDuration,
        uint256 earlyUnstakePenaltyBps,
        bool active
    ) external onlyRole(CONFIG_MANAGER_ROLE) {
        if (earlyUnstakePenaltyBps > BPS_DENOMINATOR) revert InvalidPenaltyBps(earlyUnstakePenaltyBps);
        if (maxLockDuration != 0 && maxLockDuration < minLockDuration) {
            revert LockTooLong(minLockDuration, maxLockDuration);
        }

        _chainParameters[chainId] = ChainParameters({
            minLockDuration: minLockDuration,
            maxLockDuration: maxLockDuration,
            earlyUnstakePenaltyBps: earlyUnstakePenaltyBps,
            active: active
        });

        emit ChainParametersUpdated(chainId, minLockDuration, maxLockDuration, earlyUnstakePenaltyBps, active);
    }

    function setEmergencyMode(bool enabled) external onlyRole(EMERGENCY_MANAGER_ROLE) {
        emergencyMode = enabled;
        emit EmergencyModeUpdated(enabled, emergencyWithdrawalDelay);
    }

    function setEmergencyWithdrawalDelay(uint256 delay) external onlyRole(CONFIG_MANAGER_ROLE) {
        emergencyWithdrawalDelay = delay;
        emit EmergencyModeUpdated(emergencyMode, delay);
    }

    function pause() external onlyRole(EMERGENCY_MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(EMERGENCY_MANAGER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // View helpers for UI / RewardEngine integration
    // -------------------------------------------------------------------------

    function pendingRewards(address account) external view returns (uint256) {
        return _pendingRewards(account, rewardPerToken());
    }

    function getStakePosition(address account) external view returns (uint256 amount, uint256 unlockTimestamp, uint256 accruedRewards) {
        StakePosition storage position = _stakes[account];
        return (position.amount, position.unlockTimestamp, _pendingRewards(account, rewardPerToken()));
    }

    function chainParameters(uint256 chainId)
        external
        view
        returns (
            uint256 minLockDuration,
            uint256 maxLockDuration,
            uint256 earlyUnstakePenaltyBps,
            bool active
        )
    {
        ChainParameters memory params = _chainParameters[chainId];
        return (params.minLockDuration, params.maxLockDuration, params.earlyUnstakePenaltyBps, params.active);
    }

    function emissionState(uint256 chainId)
        external
        view
        returns (
            uint256 rewardRate,
            uint256 rewardPerTokenStored,
            uint256 lastUpdateTime,
            uint256 periodFinish
        )
    {
        EmissionState memory emission = _emissions[chainId];
        return (emission.rewardRate, emission.rewardPerTokenStored, emission.lastUpdateTime, emission.periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        EmissionState memory emission = _emissions[block.chainid];
        if (totalStaked == 0) {
            return emission.rewardPerTokenStored;
        }

        uint256 applicableTime = lastTimeRewardApplicable();
        if (applicableTime <= emission.lastUpdateTime) {
            return emission.rewardPerTokenStored;
        }

        uint256 elapsed = applicableTime - emission.lastUpdateTime;
        return emission.rewardPerTokenStored + ((elapsed * emission.rewardRate * PRECISION) / totalStaked);
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        EmissionState memory emission = _emissions[block.chainid];
        if (emission.periodFinish == 0) {
            return block.timestamp;
        }
        return block.timestamp < emission.periodFinish ? block.timestamp : emission.periodFinish;
    }

    function previewAnnualPercentageYield() external view returns (uint256) {
        EmissionState memory emission = _emissions[block.chainid];
        if (totalStaked == 0 || emission.rewardRate == 0) return 0;

        uint256 annualRewards = emission.rewardRate * 365 days;
        return (annualRewards * BPS_DENOMINATOR) / totalStaked;
    }

    function hasVotingToken() external view returns (bool) {
        return address(votingToken) != address(0);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _updateReward(address account) internal {
        uint256 chainId = block.chainid;
        EmissionState storage emission = _emissions[chainId];

        uint256 newRewardPerToken = rewardPerToken();
        emission.rewardPerTokenStored = newRewardPerToken;
        emission.lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            StakePosition storage position = _stakes[account];
            position.rewards = _pendingRewards(account, newRewardPerToken);
            position.rewardPerTokenPaid = newRewardPerToken;
        }
    }

    function _pendingRewards(address account, uint256 rewardPerTokenStored_) internal view returns (uint256) {
        StakePosition storage position = _stakes[account];
        if (position.amount == 0) {
            return position.rewards;
        }
        return ((position.amount * (rewardPerTokenStored_ - position.rewardPerTokenPaid)) / PRECISION) + position.rewards;
    }
}
