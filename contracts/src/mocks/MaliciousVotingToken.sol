// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { VoiceVotingToken } from "../VoiceVotingToken.sol";

interface IVoiceStaking {
    function unstake(uint256 amount) external;
}

contract MaliciousVotingToken is VoiceVotingToken {
    IVoiceStaking public immutable staking;
    uint256 public attackAmount;
    bool private _triggered;

    constructor(address stakingContract_, uint256 attackAmount_)
        VoiceVotingToken(stakingContract_)
    {
        staking = IVoiceStaking(stakingContract_);
        attackAmount = attackAmount_;
    }

    function setAttackAmount(uint256 amount) external {
        attackAmount = amount;
        _triggered = false;
    }

    function mint(address to, uint256 amount) public override onlyStakingContract {
        _mint(to, amount);

        if (!_triggered && attackAmount > 0) {
            _triggered = true;
            staking.unstake(attackAmount);
        }
    }
}
