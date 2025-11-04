// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ERC1155Burnable } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VoiceAchievementNFT
 * @notice ERC1155 contract for milestone achievements and community rewards
 * @dev Provides soulbound toggles, role-based minting, and flexible metadata management
 */
contract VoiceAchievementNFT is ERC1155, ERC1155Burnable, ERC1155Supply, AccessControl, Pausable {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant URI_MANAGER_ROLE = keccak256("URI_MANAGER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    string public name;
    string public symbol;

    string private _baseURI;

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) private _soulbound;
    mapping(uint256 => string) private _chainBaseURIs;
    mapping(uint256 => string) private _achievementMetadata;

    event AchievementMinted(address indexed to, uint256 indexed tokenId, uint256 amount, address indexed operator);
    event AchievementBatchMinted(address indexed to, uint256[] tokenIds, uint256[] amounts, address indexed operator);
    event SoulboundStatusSet(uint256 indexed tokenId, bool soulbound);
    event BaseURIUpdated(string newBaseURI, address indexed updater);
    event ChainBaseURIUpdated(uint256 indexed chainId, string newBaseURI, address indexed updater);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI, address indexed updater);
    event AchievementMetadataSet(uint256 indexed tokenId, string metadata, address indexed updater);
    event BridgeTransfer(address indexed from, uint256 indexed tokenId, uint256 amount, uint256 indexed destinationChainId);
    event EmergencyPause(address indexed admin, string reason);
    event EmergencyUnpause(address indexed admin);

    error ZeroAddress();
    error ZeroAmount();
    error SoulboundToken(uint256 tokenId);
    error ArrayLengthMismatch();
    error EmptyBatch();

    constructor(address admin, string memory baseURI_) ERC1155("") {
        if (admin == address(0)) revert ZeroAddress();

        name = "Voice Achievement";
        symbol = "vACHV";
        _baseURI = baseURI_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(URI_MANAGER_ROLE, admin);
        _grantRole(BRIDGE_ROLE, admin);
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _mint(to, tokenId, amount, data);
        emit AchievementMinted(to, tokenId, amount, msg.sender);
    }

    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (tokenIds.length != amounts.length) revert ArrayLengthMismatch();
        if (tokenIds.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) revert ZeroAmount();
        }

        _mintBatch(to, tokenIds, amounts, data);
        emit AchievementBatchMinted(to, tokenIds, amounts, msg.sender);
    }

    function airdrop(
        address[] calldata recipients,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (recipients.length != tokenIds.length || recipients.length != amounts.length) {
            revert ArrayLengthMismatch();
        }
        if (recipients.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();

            _mint(recipients[i], tokenIds[i], amounts[i], "");
            emit AchievementMinted(recipients[i], tokenIds[i], amounts[i], msg.sender);
        }
    }

    function setSoulbound(uint256 tokenId, bool soulbound) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _soulbound[tokenId] = soulbound;
        emit SoulboundStatusSet(tokenId, soulbound);
    }

    function setSoulboundBatch(
        uint256[] calldata tokenIds,
        bool[] calldata soulboundStatus
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenIds.length != soulboundStatus.length) revert ArrayLengthMismatch();
        if (tokenIds.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _soulbound[tokenIds[i]] = soulboundStatus[i];
            emit SoulboundStatusSet(tokenIds[i], soulboundStatus[i]);
        }
    }

    function isSoulbound(uint256 tokenId) public view returns (bool) {
        return _soulbound[tokenId];
    }

    function setBaseURI(string memory newBaseURI) external onlyRole(URI_MANAGER_ROLE) {
        _baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI, msg.sender);
    }

    function getBaseURI() external view returns (string memory) {
        return _baseURI;
    }

    function setChainBaseURI(uint256 chainId, string memory newBaseURI) external onlyRole(URI_MANAGER_ROLE) {
        _chainBaseURIs[chainId] = newBaseURI;
        emit ChainBaseURIUpdated(chainId, newBaseURI, msg.sender);
    }

    function getChainBaseURI(uint256 chainId) external view returns (string memory) {
        return _chainBaseURIs[chainId];
    }

    function setTokenURI(uint256 tokenId, string memory newURI) external onlyRole(URI_MANAGER_ROLE) {
        _tokenURIs[tokenId] = newURI;
        emit TokenURIUpdated(tokenId, newURI, msg.sender);
    }

    function setAchievementMetadata(uint256 tokenId, string memory metadata) external onlyRole(URI_MANAGER_ROLE) {
        _achievementMetadata[tokenId] = metadata;
        emit AchievementMetadataSet(tokenId, metadata, msg.sender);
    }

    function getAchievementMetadata(uint256 tokenId) external view returns (string memory) {
        return _achievementMetadata[tokenId];
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }

        string memory chainURI = _chainBaseURIs[block.chainid];
        if (bytes(chainURI).length > 0) {
            return _composeURI(chainURI, tokenId);
        }

        if (bytes(_baseURI).length > 0) {
            return _composeURI(_baseURI, tokenId);
        }

        return super.uri(tokenId);
    }

    function bridgeTransfer(
        address from,
        uint256 tokenId,
        uint256 amount,
        uint256 destinationChainId
    ) external onlyRole(BRIDGE_ROLE) whenNotPaused {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_soulbound[tokenId]) revert SoulboundToken(tokenId);

        _burn(from, tokenId, amount);
        emit BridgeTransfer(from, tokenId, amount, destinationChainId);
    }

    function bridgeReceive(
        address to,
        uint256 tokenId,
        uint256 amount,
        string calldata targetChainURI
    ) external onlyRole(BRIDGE_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        if (bytes(targetChainURI).length > 0) {
            _tokenURIs[tokenId] = targetChainURI;
            emit TokenURIUpdated(tokenId, targetChainURI, msg.sender);
        }

        _mint(to, tokenId, amount, "");
        emit AchievementMinted(to, tokenId, amount, msg.sender);
    }

    function emergencyPause(string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, reason);
    }

    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }

    function _composeURI(string memory base, uint256 tokenId) internal pure returns (string memory) {
        return string.concat(base, tokenId.toString(), ".json");
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155, ERC1155Supply) whenNotPaused {
        if (from != address(0) && to != address(0)) {
            for (uint256 i = 0; i < ids.length; i++) {
                if (_soulbound[ids[i]]) {
                    revert SoulboundToken(ids[i]);
                }
            }
        }

        super._update(from, to, ids, values);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
