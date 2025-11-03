// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title VoiceVotingToken
 * @notice Wrapper token for governance voting based on staked VOICE tokens
 * @dev Extends ERC20Votes to enable delegation and snapshot-based voting power
 */
contract VoiceVotingToken is ERC20, ERC20Votes, ERC20Permit {
    address public immutable stakingContract;

    error OnlyStakingContract();
    error ZeroAddress();
    error TransfersDisabled();

    modifier onlyStakingContract() {
        if (msg.sender != stakingContract) revert OnlyStakingContract();
        _;
    }

    constructor(address stakingContract_) 
        ERC20("Voice Voting Token", "vVOICE") 
        ERC20Permit("Voice Voting Token") 
    {
        if (stakingContract_ == address(0)) revert ZeroAddress();
        stakingContract = stakingContract_;
    }

    function mint(address to, uint256 amount) external virtual onlyStakingContract {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external virtual onlyStakingContract {
        _burn(from, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
        super._update(from, to, value);
    }

    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
