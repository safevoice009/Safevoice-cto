const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VoiceAchievementNFT', function () {
  let achievementNFT;
  let admin;
  let minter;
  let uriManager;
  let bridge;
  let user1;
  let user2;
  let user3;

  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
  const URI_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('URI_MANAGER_ROLE'));
  const BRIDGE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('BRIDGE_ROLE'));
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

  const BASE_URI = 'https://api.safevoice.app/metadata/achievements/';
  const TOKEN_ID_FIRST_POST = 1;
  const TOKEN_ID_WEEKLY_STREAK = 2;
  const TOKEN_ID_HELPER = 3;
  const TOKEN_ID_LEGEND = 100;

  beforeEach(async function () {
    [admin, minter, uriManager, bridge, user1, user2, user3] = await ethers.getSigners();

    const VoiceAchievementNFTFactory = await ethers.getContractFactory('VoiceAchievementNFT');
    achievementNFT = await VoiceAchievementNFTFactory.deploy(admin.address, BASE_URI);
    await achievementNFT.deployed();

    await achievementNFT.connect(admin).grantRole(MINTER_ROLE, minter.address);
    await achievementNFT.connect(admin).grantRole(URI_MANAGER_ROLE, uriManager.address);
    await achievementNFT.connect(admin).grantRole(BRIDGE_ROLE, bridge.address);
  });

  describe('Deployment', function () {
    it('Should have correct name and symbol', async function () {
      expect(await achievementNFT.name()).to.equal('Voice Achievement');
      expect(await achievementNFT.symbol()).to.equal('vACHV');
    });

    it('Should set the correct base URI', async function () {
      expect(await achievementNFT.getBaseURI()).to.equal(BASE_URI);
    });

    it('Should grant DEFAULT_ADMIN_ROLE to admin', async function () {
      expect(await achievementNFT.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('Should grant all roles to admin initially', async function () {
      expect(await achievementNFT.hasRole(MINTER_ROLE, admin.address)).to.be.true;
      expect(await achievementNFT.hasRole(URI_MANAGER_ROLE, admin.address)).to.be.true;
      expect(await achievementNFT.hasRole(BRIDGE_ROLE, admin.address)).to.be.true;
    });

    it('Should revert if deployed with zero address admin', async function () {
      const VoiceAchievementNFTFactory = await ethers.getContractFactory('VoiceAchievementNFT');
      await expect(
        VoiceAchievementNFTFactory.deploy(ethers.constants.AddressZero, BASE_URI)
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAddress');
    });
  });

  describe('Role Management', function () {
    it('Should allow admin to grant MINTER_ROLE', async function () {
      await achievementNFT.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await achievementNFT.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it('Should allow admin to revoke MINTER_ROLE', async function () {
      await achievementNFT.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await achievementNFT.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it('Should not allow non-admin to grant roles', async function () {
      await expect(
        achievementNFT.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });

    it('Should allow renouncing own role', async function () {
      await achievementNFT.connect(minter).renounceRole(MINTER_ROLE, minter.address);
      expect(await achievementNFT.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });
  });

  describe('Minting', function () {
    it('Should mint achievement NFT with MINTER_ROLE', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(1);
    });

    it('Should mint multiple editions of same achievement', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_WEEKLY_STREAK, 5, '0x');
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_WEEKLY_STREAK)).to.equal(5);
    });

    it('Should emit AchievementMinted event', async function () {
      await expect(achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_HELPER, 1, '0x'))
        .to.emit(achievementNFT, 'AchievementMinted')
        .withArgs(user1.address, TOKEN_ID_HELPER, 1, minter.address);
    });

    it('Should track total supply correctly', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
      await achievementNFT.connect(minter).mint(user2.address, TOKEN_ID_FIRST_POST, 1, '0x');
      expect(await achievementNFT['totalSupply(uint256)'](TOKEN_ID_FIRST_POST)).to.equal(2);
    });

    it('Should not allow minting without MINTER_ROLE', async function () {
      await expect(
        achievementNFT.connect(user1).mint(user2.address, TOKEN_ID_FIRST_POST, 1, '0x')
      ).to.be.reverted;
    });

    it('Should revert when minting to zero address', async function () {
      await expect(
        achievementNFT.connect(minter).mint(ethers.constants.AddressZero, TOKEN_ID_FIRST_POST, 1, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAddress');
    });

    it('Should revert when minting zero amount', async function () {
      await expect(
        achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 0, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAmount');
    });

    it('Should not allow minting when paused', async function () {
      await achievementNFT.connect(admin).emergencyPause('Testing pause');
      await expect(
        achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'EnforcedPause');
    });
  });

  describe('Batch Minting', function () {
    it('Should mint multiple achievements in batch', async function () {
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_WEEKLY_STREAK, TOKEN_ID_HELPER];
      const amounts = [1, 1, 1];

      await achievementNFT.connect(minter).mintBatch(user1.address, tokenIds, amounts, '0x');

      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(1);
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_WEEKLY_STREAK)).to.equal(1);
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_HELPER)).to.equal(1);
    });

    it('Should emit AchievementBatchMinted event', async function () {
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_WEEKLY_STREAK];
      const amounts = [1, 1];

      await expect(achievementNFT.connect(minter).mintBatch(user1.address, tokenIds, amounts, '0x'))
        .to.emit(achievementNFT, 'AchievementBatchMinted')
        .withArgs(user1.address, tokenIds, amounts, minter.address);
    });

    it('Should revert on array length mismatch', async function () {
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_WEEKLY_STREAK];
      const amounts = [1];

      await expect(
        achievementNFT.connect(minter).mintBatch(user1.address, tokenIds, amounts, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'ArrayLengthMismatch');
    });

    it('Should revert on empty batch', async function () {
      await expect(
        achievementNFT.connect(minter).mintBatch(user1.address, [], [], '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'EmptyBatch');
    });

    it('Should revert if any amount is zero', async function () {
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_WEEKLY_STREAK];
      const amounts = [1, 0];

      await expect(
        achievementNFT.connect(minter).mintBatch(user1.address, tokenIds, amounts, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAmount');
    });
  });

  describe('Airdrop', function () {
    it('Should airdrop achievements to multiple recipients', async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_WEEKLY_STREAK, TOKEN_ID_HELPER];
      const amounts = [1, 1, 1];

      await achievementNFT.connect(minter).airdrop(recipients, tokenIds, amounts);

      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(1);
      expect(await achievementNFT.balanceOf(user2.address, TOKEN_ID_WEEKLY_STREAK)).to.equal(1);
      expect(await achievementNFT.balanceOf(user3.address, TOKEN_ID_HELPER)).to.equal(1);
    });

    it('Should emit AchievementMinted for each airdrop', async function () {
      const recipients = [user1.address, user2.address];
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_FIRST_POST];
      const amounts = [1, 1];

      const tx = await achievementNFT.connect(minter).airdrop(recipients, tokenIds, amounts);
      const receipt = await tx.wait();

      const mintEvents = receipt.events.filter(e => e.event === 'AchievementMinted');
      expect(mintEvents.length).to.equal(2);
    });

    it('Should revert on array length mismatch', async function () {
      const recipients = [user1.address, user2.address];
      const tokenIds = [TOKEN_ID_FIRST_POST];
      const amounts = [1, 1];

      await expect(
        achievementNFT.connect(minter).airdrop(recipients, tokenIds, amounts)
      ).to.be.revertedWithCustomError(achievementNFT, 'ArrayLengthMismatch');
    });

    it('Should revert if recipient is zero address', async function () {
      const recipients = [ethers.constants.AddressZero];
      const tokenIds = [TOKEN_ID_FIRST_POST];
      const amounts = [1];

      await expect(
        achievementNFT.connect(minter).airdrop(recipients, tokenIds, amounts)
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAddress');
    });

    it('Should revert if amount is zero', async function () {
      const recipients = [user1.address];
      const tokenIds = [TOKEN_ID_FIRST_POST];
      const amounts = [0];

      await expect(
        achievementNFT.connect(minter).airdrop(recipients, tokenIds, amounts)
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAmount');
    });
  });

  describe('Soulbound Functionality', function () {
    beforeEach(async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_LEGEND, 1, '0x');
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
    });

    it('Should set token as soulbound', async function () {
      await achievementNFT.connect(admin).setSoulbound(TOKEN_ID_LEGEND, true);
      expect(await achievementNFT.isSoulbound(TOKEN_ID_LEGEND)).to.be.true;
    });

    it('Should emit SoulboundStatusSet event', async function () {
      await expect(achievementNFT.connect(admin).setSoulbound(TOKEN_ID_LEGEND, true))
        .to.emit(achievementNFT, 'SoulboundStatusSet')
        .withArgs(TOKEN_ID_LEGEND, true);
    });

    it('Should prevent transfers of soulbound tokens', async function () {
      await achievementNFT.connect(admin).setSoulbound(TOKEN_ID_LEGEND, true);

      await expect(
        achievementNFT.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_LEGEND, 1, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'SoulboundToken');
    });

    it('Should allow transfers of non-soulbound tokens', async function () {
      await achievementNFT.connect(user1).safeTransferFrom(
        user1.address,
        user2.address,
        TOKEN_ID_FIRST_POST,
        1,
        '0x'
      );

      expect(await achievementNFT.balanceOf(user2.address, TOKEN_ID_FIRST_POST)).to.equal(1);
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(0);
    });

    it('Should allow burning of soulbound tokens', async function () {
      await achievementNFT.connect(admin).setSoulbound(TOKEN_ID_LEGEND, true);
      await achievementNFT.connect(user1).burn(user1.address, TOKEN_ID_LEGEND, 1);
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_LEGEND)).to.equal(0);
    });

    it('Should batch set soulbound status', async function () {
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_LEGEND];
      const statuses = [false, true];

      await achievementNFT.connect(admin).setSoulboundBatch(tokenIds, statuses);

      expect(await achievementNFT.isSoulbound(TOKEN_ID_FIRST_POST)).to.be.false;
      expect(await achievementNFT.isSoulbound(TOKEN_ID_LEGEND)).to.be.true;
    });

    it('Should revert batch soulbound on array mismatch', async function () {
      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_LEGEND];
      const statuses = [true];

      await expect(
        achievementNFT.connect(admin).setSoulboundBatch(tokenIds, statuses)
      ).to.be.revertedWithCustomError(achievementNFT, 'ArrayLengthMismatch');
    });

    it('Should not allow non-admin to set soulbound', async function () {
      await expect(
        achievementNFT.connect(user1).setSoulbound(TOKEN_ID_LEGEND, true)
      ).to.be.reverted;
    });
  });

  describe('URI Management', function () {
    it('Should return correct URI with base URI', async function () {
      const expectedURI = BASE_URI + TOKEN_ID_FIRST_POST + '.json';
      expect(await achievementNFT.uri(TOKEN_ID_FIRST_POST)).to.equal(expectedURI);
    });

    it('Should update base URI', async function () {
      const newBaseURI = 'https://new-api.safevoice.app/achievements/';
      await achievementNFT.connect(uriManager).setBaseURI(newBaseURI);
      expect(await achievementNFT.getBaseURI()).to.equal(newBaseURI);
    });

    it('Should emit BaseURIUpdated event', async function () {
      const newBaseURI = 'https://new-api.safevoice.app/achievements/';
      await expect(achievementNFT.connect(uriManager).setBaseURI(newBaseURI))
        .to.emit(achievementNFT, 'BaseURIUpdated')
        .withArgs(newBaseURI, uriManager.address);
    });

    it('Should set token-specific URI', async function () {
      const customURI = 'ipfs://QmCustomHash';
      await achievementNFT.connect(uriManager).setTokenURI(TOKEN_ID_LEGEND, customURI);
      expect(await achievementNFT.uri(TOKEN_ID_LEGEND)).to.equal(customURI);
    });

    it('Should emit TokenURIUpdated event', async function () {
      const customURI = 'ipfs://QmCustomHash';
      await expect(achievementNFT.connect(uriManager).setTokenURI(TOKEN_ID_LEGEND, customURI))
        .to.emit(achievementNFT, 'TokenURIUpdated')
        .withArgs(TOKEN_ID_LEGEND, customURI, uriManager.address);
    });

    it('Should prioritize token-specific URI over base URI', async function () {
      const customURI = 'ipfs://QmSpecialHash';
      await achievementNFT.connect(uriManager).setTokenURI(TOKEN_ID_HELPER, customURI);

      const returnedURI = await achievementNFT.uri(TOKEN_ID_HELPER);
      expect(returnedURI).to.equal(customURI);
      expect(returnedURI).to.not.include(BASE_URI);
    });

    it('Should set chain-specific base URI', async function () {
      const chainId = 137;
      const polygonURI = 'https://polygon.safevoice.app/metadata/';
      await achievementNFT.connect(uriManager).setChainBaseURI(chainId, polygonURI);
      expect(await achievementNFT.getChainBaseURI(chainId)).to.equal(polygonURI);
    });

    it('Should emit ChainBaseURIUpdated event', async function () {
      const chainId = 137;
      const polygonURI = 'https://polygon.safevoice.app/metadata/';
      await expect(achievementNFT.connect(uriManager).setChainBaseURI(chainId, polygonURI))
        .to.emit(achievementNFT, 'ChainBaseURIUpdated')
        .withArgs(chainId, polygonURI, uriManager.address);
    });

    it('Should not allow non-URI manager to update URIs', async function () {
      await expect(
        achievementNFT.connect(user1).setBaseURI('https://unauthorized/')
      ).to.be.reverted;
    });

    it('Should set and retrieve achievement metadata', async function () {
      const metadata = '{"name":"First Post","description":"Created your first post","tier":"bronze"}';
      await achievementNFT.connect(uriManager).setAchievementMetadata(TOKEN_ID_FIRST_POST, metadata);
      expect(await achievementNFT.getAchievementMetadata(TOKEN_ID_FIRST_POST)).to.equal(metadata);
    });

    it('Should emit AchievementMetadataSet event', async function () {
      const metadata = '{"name":"Helper","tier":"silver"}';
      await expect(
        achievementNFT.connect(uriManager).setAchievementMetadata(TOKEN_ID_HELPER, metadata)
      )
        .to.emit(achievementNFT, 'AchievementMetadataSet')
        .withArgs(TOKEN_ID_HELPER, metadata, uriManager.address);
    });
  });

  describe('Bridge Operations', function () {
    beforeEach(async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_LEGEND, 1, '0x');
    });

    it('Should bridge transfer achievement to another chain', async function () {
      const destinationChainId = 137;

      await expect(
        achievementNFT.connect(bridge).bridgeTransfer(user1.address, TOKEN_ID_FIRST_POST, 1, destinationChainId)
      )
        .to.emit(achievementNFT, 'BridgeTransfer')
        .withArgs(user1.address, TOKEN_ID_FIRST_POST, 1, destinationChainId);

      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(0);
    });

    it('Should not allow bridging soulbound tokens', async function () {
      await achievementNFT.connect(admin).setSoulbound(TOKEN_ID_LEGEND, true);

      await expect(
        achievementNFT.connect(bridge).bridgeTransfer(user1.address, TOKEN_ID_LEGEND, 1, 137)
      ).to.be.revertedWithCustomError(achievementNFT, 'SoulboundToken');
    });

    it('Should bridge receive achievement from another chain', async function () {
      const targetChainURI = 'https://polygon-api.safevoice.app/metadata/1.json';

      await achievementNFT.connect(bridge).bridgeReceive(
        user2.address,
        TOKEN_ID_WEEKLY_STREAK,
        1,
        targetChainURI
      );

      expect(await achievementNFT.balanceOf(user2.address, TOKEN_ID_WEEKLY_STREAK)).to.equal(1);
      expect(await achievementNFT.uri(TOKEN_ID_WEEKLY_STREAK)).to.equal(targetChainURI);
    });

    it('Should not require MINTER_ROLE for bridge receive', async function () {
      await achievementNFT.connect(bridge).bridgeReceive(user2.address, TOKEN_ID_HELPER, 1, '');
      expect(await achievementNFT.balanceOf(user2.address, TOKEN_ID_HELPER)).to.equal(1);
    });

    it('Should not allow non-bridge to perform bridge operations', async function () {
      await expect(
        achievementNFT.connect(user1).bridgeTransfer(user1.address, TOKEN_ID_FIRST_POST, 1, 137)
      ).to.be.reverted;

      await expect(
        achievementNFT.connect(user1).bridgeReceive(user2.address, TOKEN_ID_HELPER, 1, '')
      ).to.be.reverted;
    });

    it('Should revert bridge transfer with zero amount', async function () {
      await expect(
        achievementNFT.connect(bridge).bridgeTransfer(user1.address, TOKEN_ID_FIRST_POST, 0, 137)
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAmount');
    });

    it('Should revert bridge receive with zero amount', async function () {
      await expect(
        achievementNFT.connect(bridge).bridgeReceive(user2.address, TOKEN_ID_HELPER, 0, '')
      ).to.be.revertedWithCustomError(achievementNFT, 'ZeroAmount');
    });
  });

  describe('Pause Functionality', function () {
    it('Should pause all operations', async function () {
      await achievementNFT.connect(admin).emergencyPause('Security issue detected');
      expect(await achievementNFT.paused()).to.be.true;
    });

    it('Should emit EmergencyPause event', async function () {
      await expect(achievementNFT.connect(admin).emergencyPause('Testing'))
        .to.emit(achievementNFT, 'EmergencyPause')
        .withArgs(admin.address, 'Testing');
    });

    it('Should unpause operations', async function () {
      await achievementNFT.connect(admin).emergencyPause('Test');
      await achievementNFT.connect(admin).emergencyUnpause();
      expect(await achievementNFT.paused()).to.be.false;
    });

    it('Should emit EmergencyUnpause event', async function () {
      await achievementNFT.connect(admin).emergencyPause('Test');
      await expect(achievementNFT.connect(admin).emergencyUnpause())
        .to.emit(achievementNFT, 'EmergencyUnpause')
        .withArgs(admin.address);
    });

    it('Should prevent minting when paused', async function () {
      await achievementNFT.connect(admin).emergencyPause('Test');
      await expect(
        achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'EnforcedPause');
    });

    it('Should prevent transfers when paused', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
      await achievementNFT.connect(admin).emergencyPause('Test');

      await expect(
        achievementNFT.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_FIRST_POST, 1, '0x')
      ).to.be.revertedWithCustomError(achievementNFT, 'EnforcedPause');
    });

    it('Should allow operations after unpause', async function () {
      await achievementNFT.connect(admin).emergencyPause('Test');
      await achievementNFT.connect(admin).emergencyUnpause();

      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(1);
    });

    it('Should not allow non-admin to pause', async function () {
      await expect(
        achievementNFT.connect(user1).emergencyPause('Unauthorized')
      ).to.be.reverted;
    });
  });

  describe('Supply Tracking', function () {
    it('Should track total supply per token ID', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 5, '0x');
      await achievementNFT.connect(minter).mint(user2.address, TOKEN_ID_FIRST_POST, 3, '0x');

      expect(await achievementNFT['totalSupply(uint256)'](TOKEN_ID_FIRST_POST)).to.equal(8);
    });

    it('Should decrease supply when burned', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_HELPER, 10, '0x');
      await achievementNFT.connect(user1).burn(user1.address, TOKEN_ID_HELPER, 3);

      expect(await achievementNFT['totalSupply(uint256)'](TOKEN_ID_HELPER)).to.equal(7);
    });

    it('Should track if token exists', async function () {
      expect(await achievementNFT.exists(TOKEN_ID_FIRST_POST)).to.be.false;

      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 1, '0x');
      expect(await achievementNFT.exists(TOKEN_ID_FIRST_POST)).to.be.true;
    });
  });

  describe('Burning', function () {
    beforeEach(async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_FIRST_POST, 5, '0x');
    });

    it('Should allow user to burn their own tokens', async function () {
      await achievementNFT.connect(user1).burn(user1.address, TOKEN_ID_FIRST_POST, 2);
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(3);
    });

    it('Should allow batch burning', async function () {
      await achievementNFT.connect(minter).mint(user1.address, TOKEN_ID_WEEKLY_STREAK, 3, '0x');

      const tokenIds = [TOKEN_ID_FIRST_POST, TOKEN_ID_WEEKLY_STREAK];
      const amounts = [2, 1];

      await achievementNFT.connect(user1).burnBatch(user1.address, tokenIds, amounts);

      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_FIRST_POST)).to.equal(3);
      expect(await achievementNFT.balanceOf(user1.address, TOKEN_ID_WEEKLY_STREAK)).to.equal(2);
    });

    it('Should decrease total supply when burned', async function () {
      const initialSupply = await achievementNFT['totalSupply(uint256)'](TOKEN_ID_FIRST_POST);
      await achievementNFT.connect(user1).burn(user1.address, TOKEN_ID_FIRST_POST, 1);
      expect(await achievementNFT['totalSupply(uint256)'](TOKEN_ID_FIRST_POST)).to.equal(initialSupply.sub(1));
    });
  });

  describe('Interface Support', function () {
    it('Should support ERC1155 interface', async function () {
      const ERC1155InterfaceId = '0xd9b67a26';
      expect(await achievementNFT.supportsInterface(ERC1155InterfaceId)).to.be.true;
    });

    it('Should support AccessControl interface', async function () {
      const AccessControlInterfaceId = '0x7965db0b';
      expect(await achievementNFT.supportsInterface(AccessControlInterfaceId)).to.be.true;
    });
  });
});
