// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VoiceToken } from "./VoiceToken.sol";

/**
 * @title VoiceVesting
 * @notice Manages token vesting schedules for Voice Token distribution across
 *         community rewards, treasury, team, and ecosystem allocations
 * @dev Supports linear and cliff vesting with timelock-protected beneficiary updates
 *      and emergency pause functionality
 *
 * Features:
 * - Predefined tranches aligned with 1B token supply cap
 * - Linear vesting with optional cliff periods
 * - Revocable and non-revocable schedules
 * - Timelock protection for beneficiary changes (48 hours)
 * - Emergency pause for security incidents
 * - Integration with VoiceToken minting allowances
 *
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can create schedules, pause/unpause
 * - REVOKER_ROLE: Can revoke vesting schedules
 *
 * Token Distribution (aligned with 1B supply cap):
 * - Community Rewards: 40% (400M tokens)
 * - Treasury: 25% (250M tokens)
 * - Team: 20% (200M tokens)
 * - Ecosystem: 15% (150M tokens)
 */
contract VoiceVesting is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    uint256 public constant TIMELOCK_DELAY = 48 hours;
    
    uint256 public constant COMMUNITY_ALLOCATION = 400_000_000 * 10**18;
    uint256 public constant TREASURY_ALLOCATION = 250_000_000 * 10**18;
    uint256 public constant TEAM_ALLOCATION = 200_000_000 * 10**18;
    uint256 public constant ECOSYSTEM_ALLOCATION = 150_000_000 * 10**18;
    uint256 public constant TOTAL_ALLOCATION = 1_000_000_000 * 10**18;

    enum TrancheType {
        COMMUNITY,
        TREASURY,
        TEAM,
        ECOSYSTEM
    }

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 duration;
        uint256 releasedAmount;
        address beneficiary;
        TrancheType tranche;
        bool revocable;
        bool revoked;
    }

    struct BeneficiaryUpdate {
        address newBeneficiary;
        uint256 effectiveTime;
        bool executed;
    }

    VoiceToken public immutable voiceToken;

    uint256 private _scheduleIdCounter;
    
    mapping(uint256 => VestingSchedule) public vestingSchedules;
    mapping(uint256 => BeneficiaryUpdate) public pendingBeneficiaryUpdates;
    
    mapping(TrancheType => uint256) public allocatedByTranche;
    mapping(TrancheType => uint256) public releasedByTranche;
    
    mapping(address => uint256[]) private _beneficiarySchedules;

    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        TrancheType indexed tranche,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        bool revocable
    );

    event TokensReleased(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );

    event VestingRevoked(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 unvestedAmount
    );

    event BeneficiaryUpdateScheduled(
        uint256 indexed scheduleId,
        address indexed currentBeneficiary,
        address indexed newBeneficiary,
        uint256 effectiveTime
    );

    event BeneficiaryUpdated(
        uint256 indexed scheduleId,
        address indexed oldBeneficiary,
        address indexed newBeneficiary
    );

    event EmergencyPause(address indexed admin, string reason);
    event EmergencyUnpause(address indexed admin);

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDuration();
    error InvalidCliff();
    error TrancheAllocationExceeded(TrancheType tranche, uint256 requested, uint256 available);
    error ScheduleNotFound(uint256 scheduleId);
    error NotBeneficiary(address caller, address beneficiary);
    error NoTokensVested();
    error AlreadyRevoked();
    error NotRevocable();
    error TimelockNotExpired(uint256 currentTime, uint256 effectiveTime);
    error BeneficiaryUpdateAlreadyExecuted();
    error NoPendingBeneficiaryUpdate();

    /**
     * @notice Deploys the VoiceVesting contract
     * @param _voiceToken Address of the VoiceToken contract
     * @param admin Address that will receive DEFAULT_ADMIN_ROLE
     */
    constructor(address _voiceToken, address admin) {
        if (_voiceToken == address(0) || admin == address(0)) revert ZeroAddress();
        
        voiceToken = VoiceToken(_voiceToken);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
    }

    /**
     * @notice Creates a new vesting schedule
     * @param beneficiary Address of the beneficiary
     * @param tranche Type of allocation tranche
     * @param totalAmount Total tokens to vest
     * @param startTime Unix timestamp when vesting starts
     * @param cliffDuration Duration in seconds before any tokens vest
     * @param duration Total vesting duration in seconds (after start)
     * @param revocable Whether the schedule can be revoked
     * @return scheduleId The ID of the created vesting schedule
     */
    function createVestingSchedule(
        address beneficiary,
        TrancheType tranche,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        bool revocable
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused returns (uint256 scheduleId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAmount();
        if (duration == 0) revert InvalidDuration();
        if (cliffDuration > duration) revert InvalidCliff();
        if (startTime == 0) startTime = block.timestamp;

        uint256 trancheAllocation = _getTrancheCap(tranche);
        uint256 newAllocated = allocatedByTranche[tranche] + totalAmount;
        if (newAllocated > trancheAllocation) {
            revert TrancheAllocationExceeded(
                tranche,
                totalAmount,
                trancheAllocation - allocatedByTranche[tranche]
            );
        }

        scheduleId = _scheduleIdCounter++;
        
        vestingSchedules[scheduleId] = VestingSchedule({
            totalAmount: totalAmount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            duration: duration,
            releasedAmount: 0,
            beneficiary: beneficiary,
            tranche: tranche,
            revocable: revocable,
            revoked: false
        });

        allocatedByTranche[tranche] = newAllocated;
        _beneficiarySchedules[beneficiary].push(scheduleId);

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            tranche,
            totalAmount,
            startTime,
            cliffDuration,
            duration,
            revocable
        );
    }

    /**
     * @notice Releases vested tokens for a specific schedule
     * @param scheduleId ID of the vesting schedule
     */
    function release(uint256 scheduleId) external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound(scheduleId);
        if (msg.sender != schedule.beneficiary) {
            revert NotBeneficiary(msg.sender, schedule.beneficiary);
        }
        if (schedule.revoked) revert AlreadyRevoked();

        uint256 releasable = _computeReleasableAmount(schedule);
        if (releasable == 0) revert NoTokensVested();

        schedule.releasedAmount += releasable;
        releasedByTranche[schedule.tranche] += releasable;

        voiceToken.mint(schedule.beneficiary, releasable);

        emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
    }

    /**
     * @notice Revokes a vesting schedule, stopping further vesting
     * @param scheduleId ID of the vesting schedule to revoke
     */
    function revoke(uint256 scheduleId) external onlyRole(REVOKER_ROLE) whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound(scheduleId);
        if (!schedule.revocable) revert NotRevocable();
        if (schedule.revoked) revert AlreadyRevoked();

        uint256 releasable = _computeReleasableAmount(schedule);
        
        if (releasable > 0) {
            schedule.releasedAmount += releasable;
            releasedByTranche[schedule.tranche] += releasable;
            voiceToken.mint(schedule.beneficiary, releasable);
            emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
        }

        uint256 unvested = schedule.totalAmount - schedule.releasedAmount;
        schedule.revoked = true;

        if (unvested > 0) {
            allocatedByTranche[schedule.tranche] -= unvested;
        }

        emit VestingRevoked(scheduleId, schedule.beneficiary, unvested);
    }

    /**
     * @notice Schedules a beneficiary update with timelock delay
     * @param scheduleId ID of the vesting schedule
     * @param newBeneficiary New beneficiary address
     */
    function scheduleBeneficiaryUpdate(
        uint256 scheduleId,
        address newBeneficiary
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound(scheduleId);
        if (newBeneficiary == address(0)) revert ZeroAddress();
        if (schedule.revoked) revert AlreadyRevoked();

        uint256 effectiveTime = block.timestamp + TIMELOCK_DELAY;

        pendingBeneficiaryUpdates[scheduleId] = BeneficiaryUpdate({
            newBeneficiary: newBeneficiary,
            effectiveTime: effectiveTime,
            executed: false
        });

        emit BeneficiaryUpdateScheduled(
            scheduleId,
            schedule.beneficiary,
            newBeneficiary,
            effectiveTime
        );
    }

    /**
     * @notice Executes a pending beneficiary update after timelock expires
     * @param scheduleId ID of the vesting schedule
     */
    function executeBeneficiaryUpdate(uint256 scheduleId) external whenNotPaused {
        BeneficiaryUpdate storage update = pendingBeneficiaryUpdates[scheduleId];
        
        if (update.newBeneficiary == address(0)) revert NoPendingBeneficiaryUpdate();
        if (update.executed) revert BeneficiaryUpdateAlreadyExecuted();
        if (block.timestamp < update.effectiveTime) {
            revert TimelockNotExpired(block.timestamp, update.effectiveTime);
        }

        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        address oldBeneficiary = schedule.beneficiary;

        _removeBeneficiarySchedule(oldBeneficiary, scheduleId);
        
        schedule.beneficiary = update.newBeneficiary;
        _beneficiarySchedules[update.newBeneficiary].push(scheduleId);
        
        update.executed = true;

        emit BeneficiaryUpdated(scheduleId, oldBeneficiary, update.newBeneficiary);
    }

    /**
     * @notice Pauses all vesting operations
     * @param reason Human-readable reason for emergency pause
     */
    function emergencyPause(string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, reason);
    }

    /**
     * @notice Unpauses vesting operations
     */
    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }

    /**
     * @notice Computes the vested amount for a schedule
     * @param scheduleId ID of the vesting schedule
     * @return The total vested amount (including already released)
     */
    function computeVestedAmount(uint256 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound(scheduleId);
        return _computeVestedAmount(schedule);
    }

    /**
     * @notice Computes the releasable amount for a schedule
     * @param scheduleId ID of the vesting schedule
     * @return The amount available to release now
     */
    function computeReleasableAmount(uint256 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound(scheduleId);
        if (schedule.revoked) return 0;
        return _computeReleasableAmount(schedule);
    }

    /**
     * @notice Returns all schedule IDs for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return Array of schedule IDs
     */
    function getBeneficiarySchedules(address beneficiary) external view returns (uint256[] memory) {
        return _beneficiarySchedules[beneficiary];
    }

    /**
     * @notice Returns the remaining allocation for a tranche
     * @param tranche The tranche type
     * @return The remaining unallocated tokens
     */
    function getRemainingAllocation(TrancheType tranche) external view returns (uint256) {
        return _getTrancheCap(tranche) - allocatedByTranche[tranche];
    }

    /**
     * @notice Returns comprehensive vesting statistics
     * @return totalAllocated Total tokens allocated across all schedules
     * @return totalReleased Total tokens released to beneficiaries
     * @return totalVested Total tokens vested (but not necessarily released)
     * @return totalUnvested Total tokens not yet vested
     */
    function getVestingStats() external view returns (
        uint256 totalAllocated,
        uint256 totalReleased,
        uint256 totalVested,
        uint256 totalUnvested
    ) {
        for (uint256 i = 0; i < 4; i++) {
            TrancheType tranche = TrancheType(i);
            totalAllocated += allocatedByTranche[tranche];
            totalReleased += releasedByTranche[tranche];
        }

        for (uint256 i = 0; i < _scheduleIdCounter; i++) {
            VestingSchedule storage schedule = vestingSchedules[i];
            if (schedule.beneficiary != address(0) && !schedule.revoked) {
                totalVested += _computeVestedAmount(schedule);
            }
        }

        totalUnvested = totalAllocated - totalVested;
    }

    /**
     * @dev Computes the vested amount for a schedule
     */
    function _computeVestedAmount(VestingSchedule storage schedule) private view returns (uint256) {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.totalAmount;
        }

        uint256 timeFromStart = block.timestamp - schedule.startTime;
        return (schedule.totalAmount * timeFromStart) / schedule.duration;
    }

    /**
     * @dev Computes the releasable amount for a schedule
     */
    function _computeReleasableAmount(VestingSchedule storage schedule) private view returns (uint256) {
        uint256 vested = _computeVestedAmount(schedule);
        return vested - schedule.releasedAmount;
    }

    /**
     * @dev Returns the allocation cap for a tranche
     */
    function _getTrancheCap(TrancheType tranche) private pure returns (uint256) {
        if (tranche == TrancheType.COMMUNITY) return COMMUNITY_ALLOCATION;
        if (tranche == TrancheType.TREASURY) return TREASURY_ALLOCATION;
        if (tranche == TrancheType.TEAM) return TEAM_ALLOCATION;
        return ECOSYSTEM_ALLOCATION;
    }

    /**
     * @dev Removes a schedule ID from a beneficiary's list
     */
    function _removeBeneficiarySchedule(address beneficiary, uint256 scheduleId) private {
        uint256[] storage schedules = _beneficiarySchedules[beneficiary];
        for (uint256 i = 0; i < schedules.length; i++) {
            if (schedules[i] == scheduleId) {
                schedules[i] = schedules[schedules.length - 1];
                schedules.pop();
                break;
            }
        }
    }
}
