// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Pausable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VoiceToken
 * @notice ERC20 token for SafeVoice platform with supply cap, role-based access control,
 *         EIP-2612 permit support, and emergency pause functionality
 * @dev Implements OpenZeppelin's ERC20, AccessControl, Pausable, Burnable, and Permit extensions
 *
 * Features:
 * - Fixed supply cap of 1 billion tokens
 * - Role-based minting and burning
 * - Bridge integration support
 * - Emergency pause functionality
 * - EIP-2612 gasless approvals via permit
 * - Custom events for off-chain synchronization
 *
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles, pause/unpause
 * - MINTER_ROLE: Can mint new tokens (up to cap)
 * - BURNER_ROLE: Can burn tokens from any address
 * - BRIDGE_ROLE: Special role for cross-chain bridge operations
 */
contract VoiceToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ERC20Permit {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    uint256 public constant SUPPLY_CAP = 1_000_000_000 * 10**18; // 1 billion tokens

    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount, address indexed burner);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, uint256 indexed chainId);
    event SupplyCapReached(uint256 totalSupply);
    event EmergencyPause(address indexed admin, string reason);
    event EmergencyUnpause(address indexed admin);

    error SupplyCapExceeded(uint256 attemptedSupply, uint256 cap);
    error InsufficientBalance(address account, uint256 balance, uint256 required);
    error ZeroAddress();
    error ZeroAmount();
    error ArrayLengthMismatch();
    error EmptyBatch();

    /**
     * @notice Deploys the VoiceToken contract
     * @param admin Address that will receive DEFAULT_ADMIN_ROLE
     * @dev Admin can grant other roles and manage emergency pause
     */
    constructor(address admin) ERC20("Voice Token", "VOICE") ERC20Permit("Voice Token") {
        if (admin == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Mints new tokens to a specified address
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     * @dev Restricted to MINTER_ROLE, respects supply cap
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 newSupply = totalSupply() + amount;
        if (newSupply > SUPPLY_CAP) {
            revert SupplyCapExceeded(newSupply, SUPPLY_CAP);
        }

        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);

        if (newSupply == SUPPLY_CAP) {
            emit SupplyCapReached(newSupply);
        }
    }

    /**
     * @notice Burns tokens from a specified address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @dev Restricted to BURNER_ROLE
     */
    function burnFrom(address from, uint256 amount) public override onlyRole(BURNER_ROLE) whenNotPaused {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 fromBalance = balanceOf(from);
        if (fromBalance < amount) {
            revert InsufficientBalance(from, fromBalance, amount);
        }

        _burn(from, amount);
        emit TokensBurned(from, amount, msg.sender);
    }

    /**
     * @notice Bridge transfer function for cross-chain operations
     * @param from Source address
     * @param amount Amount to bridge
     * @param destinationChainId Target chain ID
     * @dev Restricted to BRIDGE_ROLE, burns tokens and emits event for bridge monitoring
     */
    function bridgeTransfer(
        address from,
        uint256 amount,
        uint256 destinationChainId
    ) external onlyRole(BRIDGE_ROLE) whenNotPaused {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 fromBalance = balanceOf(from);
        if (fromBalance < amount) {
            revert InsufficientBalance(from, fromBalance, amount);
        }

        _burn(from, amount);
        emit BridgeTransfer(from, address(0), amount, destinationChainId);
    }

    /**
     * @notice Bridge receive function for cross-chain operations
     * @param to Destination address
     * @param amount Amount to receive
     * @param sourceChainId Source chain ID
     * @dev Restricted to BRIDGE_ROLE, mints tokens and emits event for bridge monitoring
     */
    function bridgeReceive(
        address to,
        uint256 amount,
        uint256 sourceChainId
    ) external onlyRole(BRIDGE_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 newSupply = totalSupply() + amount;
        if (newSupply > SUPPLY_CAP) {
            revert SupplyCapExceeded(newSupply, SUPPLY_CAP);
        }

        _mint(to, amount);
        emit BridgeTransfer(address(0), to, amount, sourceChainId);
    }

    /**
     * @notice Pauses all token transfers, minting, and burning
     * @param reason Human-readable reason for emergency pause
     * @dev Restricted to DEFAULT_ADMIN_ROLE
     */
    function emergencyPause(string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, reason);
    }

    /**
     * @notice Unpauses the contract
     * @dev Restricted to DEFAULT_ADMIN_ROLE
     */
    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }

    /**
     * @notice Returns the remaining tokens that can be minted
     * @return Amount of tokens that can still be minted before hitting cap
     */
    function remainingMintableSupply() external view returns (uint256) {
        return SUPPLY_CAP - totalSupply();
    }

    /**
     * @notice Checks if supply cap has been reached
     * @return True if total supply equals the cap
     */
    function isSupplyCapReached() external view returns (bool) {
        return totalSupply() == SUPPLY_CAP;
    }

    /**
     * @notice Batch transfer function for efficient airdrops and distributions
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts corresponding to recipients
     * @dev Arrays must be equal length, useful for reward distributions
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external whenNotPaused returns (bool) {
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();
        if (recipients.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) continue;
            
            _transfer(msg.sender, recipients[i], amounts[i]);
        }

        return true;
    }

    /**
     * @notice Required override for ERC20Pausable
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
