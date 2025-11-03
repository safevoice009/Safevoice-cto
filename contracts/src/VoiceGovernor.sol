// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Governor } from "@openzeppelin/contracts/governance/Governor.sol";
import { GovernorSettings } from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import { GovernorCountingSimple } from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import { GovernorVotes } from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import { GovernorVotesQuorumFraction } from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title VoiceGovernor
 * @notice On-chain governance contract for VOICE token holders
 * @dev Uses OpenZeppelin Governor framework with voting power delegated through VoiceVotingToken
 *
 * Features:
 * - Proposal creation, voting, and execution
 * - Configurable voting delay, period, and quorum
 * - Supports delegation via VoiceVotingToken
 * - Multi-chain aware for cross-chain governance coordination
 */
contract VoiceGovernor is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    error VotingDelayTooLarge(uint256 maxAllowed, uint256 provided);
    error VotingPeriodTooLarge(uint256 maxAllowed, uint256 provided);

    constructor(
        IVotes votingToken,
        uint256 votingDelay_,
        uint256 votingPeriod_,
        uint256 proposalThreshold_,
        uint256 quorumPercentage_
    )
        Governor("VoiceGovernor")
        GovernorSettings(_castVotingDelay(votingDelay_), _castVotingPeriod(votingPeriod_), proposalThreshold_)
        GovernorVotes(votingToken)
        GovernorVotesQuorumFraction(quorumPercentage_)
    {}

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function _propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        address proposer
    ) internal override(Governor) returns (uint256) {
        return super._propose(targets, values, calldatas, description, proposer);
    }

    function supportsInterface(bytes4 interfaceId) public view override(Governor) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _castVotingDelay(uint256 delay) internal pure returns (uint48) {
        uint256 maxUint48 = type(uint48).max;
        if (delay > maxUint48) revert VotingDelayTooLarge(maxUint48, delay);
        return uint48(delay);
    }

    function _castVotingPeriod(uint256 period) internal pure returns (uint32) {
        uint256 maxUint32 = type(uint32).max;
        if (period > maxUint32) revert VotingPeriodTooLarge(maxUint32, period);
        return uint32(period);
    }
}
