const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('VoiceToken', function () {
  let voiceToken;
  let admin;
  let minter;
  let burner;
  let bridge;
  let user1;
  let user2;
  let user3;

  const SUPPLY_CAP = ethers.utils.parseEther('1000000000');
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
  const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('BURNER_ROLE'));
  const BRIDGE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('BRIDGE_ROLE'));
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

  beforeEach(async function () {
    [admin, minter, burner, bridge, user1, user2, user3] = await ethers.getSigners();

    const VoiceTokenFactory = await ethers.getContractFactory('VoiceToken');
    voiceToken = await VoiceTokenFactory.deploy(admin.address);
    await voiceToken.deployed();

    await voiceToken.connect(admin).grantRole(MINTER_ROLE, minter.address);
    await voiceToken.connect(admin).grantRole(BURNER_ROLE, burner.address);
    await voiceToken.connect(admin).grantRole(BRIDGE_ROLE, bridge.address);
  });

  describe('Deployment', function () {
    it('Should have correct name and symbol', async function () {
      expect(await voiceToken.name()).to.equal('Voice Token');
      expect(await voiceToken.symbol()).to.equal('VOICE');
    });

    it('Should have 18 decimals', async function () {
      expect(await voiceToken.decimals()).to.equal(18);
    });

    it('Should set the correct supply cap', async function () {
      expect(await voiceToken.SUPPLY_CAP()).to.equal(SUPPLY_CAP);
    });

    it('Should grant DEFAULT_ADMIN_ROLE to admin', async function () {
      expect(await voiceToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('Should start with zero total supply', async function () {
      expect(await voiceToken.totalSupply()).to.equal(0);
    });

    it('Should report full mintable supply initially', async function () {
      expect(await voiceToken.remainingMintableSupply()).to.equal(SUPPLY_CAP);
    });

    it('Should not have reached supply cap initially', async function () {
      expect(await voiceToken.isSupplyCapReached()).to.be.false;
    });

    it('Should revert if deployed with zero address admin', async function () {
      const VoiceTokenFactory = await ethers.getContractFactory('VoiceToken');
      await expect(VoiceTokenFactory.deploy(ethers.constants.AddressZero))
        .to.be.revertedWithCustomError(voiceToken, 'ZeroAddress');
    });
  });

  describe('Role Management', function () {
    it('Should allow admin to grant MINTER_ROLE', async function () {
      await voiceToken.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await voiceToken.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it('Should allow admin to revoke MINTER_ROLE', async function () {
      await voiceToken.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await voiceToken.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it('Should not allow non-admin to grant roles', async function () {
      await expect(
        voiceToken.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });

    it('Should allow renouncing own role', async function () {
      await voiceToken.connect(minter).renounceRole(MINTER_ROLE, minter.address);
      expect(await voiceToken.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it('Should support multiple addresses with same role', async function () {
      await voiceToken.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await voiceToken.hasRole(MINTER_ROLE, minter.address)).to.be.true;
      expect(await voiceToken.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });
  });

  describe('Minting', function () {
    const mintAmount = ethers.utils.parseEther('1000');

    it('Should allow minter to mint tokens', async function () {
      await voiceToken.connect(minter).mint(user1.address, mintAmount);
      expect(await voiceToken.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it('Should emit TokensMinted event', async function () {
      await expect(voiceToken.connect(minter).mint(user1.address, mintAmount))
        .to.emit(voiceToken, 'TokensMinted')
        .withArgs(user1.address, mintAmount, minter.address);
    });

    it('Should not allow non-minter to mint', async function () {
      await expect(
        voiceToken.connect(user1).mint(user2.address, mintAmount)
      ).to.be.reverted;
    });

    it('Should not allow minting to zero address', async function () {
      await expect(
        voiceToken.connect(minter).mint(ethers.constants.AddressZero, mintAmount)
      ).to.be.revertedWithCustomError(voiceToken, 'ZeroAddress');
    });

    it('Should not allow minting zero amount', async function () {
      await expect(
        voiceToken.connect(minter).mint(user1.address, 0)
      ).to.be.revertedWithCustomError(voiceToken, 'ZeroAmount');
    });

    it('Should update total supply after minting', async function () {
      await voiceToken.connect(minter).mint(user1.address, mintAmount);
      expect(await voiceToken.totalSupply()).to.equal(mintAmount);
    });

    it('Should update remaining mintable supply', async function () {
      await voiceToken.connect(minter).mint(user1.address, mintAmount);
      expect(await voiceToken.remainingMintableSupply()).to.equal(SUPPLY_CAP.sub(mintAmount));
    });
  });

  describe('Supply Cap Enforcement', function () {
    it('Should not allow minting beyond cap', async function () {
      const maxMint = SUPPLY_CAP;
      const overMint = ethers.utils.parseEther('1');

      await voiceToken.connect(minter).mint(user1.address, maxMint);

      await expect(
        voiceToken.connect(minter).mint(user2.address, overMint)
      ).to.be.revertedWithCustomError(voiceToken, 'SupplyCapExceeded');
    });

    it('Should emit SupplyCapReached when cap is hit', async function () {
      await expect(voiceToken.connect(minter).mint(user1.address, SUPPLY_CAP))
        .to.emit(voiceToken, 'SupplyCapReached')
        .withArgs(SUPPLY_CAP);
    });

    it('Should report cap reached when total supply equals cap', async function () {
      await voiceToken.connect(minter).mint(user1.address, SUPPLY_CAP);
      expect(await voiceToken.isSupplyCapReached()).to.be.true;
    });

    it('Should allow minting exactly to cap', async function () {
      await voiceToken.connect(minter).mint(user1.address, SUPPLY_CAP);
      expect(await voiceToken.totalSupply()).to.equal(SUPPLY_CAP);
      expect(await voiceToken.remainingMintableSupply()).to.equal(0);
    });

    it('Should allow minting after burning', async function () {
      const mintAmount = ethers.utils.parseEther('1000');
      
      await voiceToken.connect(minter).mint(user1.address, SUPPLY_CAP);
      expect(await voiceToken.isSupplyCapReached()).to.be.true;

      await voiceToken.connect(burner).burnFrom(user1.address, mintAmount);
      
      await voiceToken.connect(minter).mint(user2.address, mintAmount);
      expect(await voiceToken.balanceOf(user2.address)).to.equal(mintAmount);
    });
  });

  describe('Burning', function () {
    const mintAmount = ethers.utils.parseEther('1000');
    const burnAmount = ethers.utils.parseEther('500');

    beforeEach(async function () {
      await voiceToken.connect(minter).mint(user1.address, mintAmount);
    });

    it('Should allow burner to burn tokens', async function () {
      await voiceToken.connect(burner).burnFrom(user1.address, burnAmount);
      expect(await voiceToken.balanceOf(user1.address)).to.equal(mintAmount.sub(burnAmount));
    });

    it('Should emit TokensBurned event', async function () {
      await expect(voiceToken.connect(burner).burnFrom(user1.address, burnAmount))
        .to.emit(voiceToken, 'TokensBurned')
        .withArgs(user1.address, burnAmount, burner.address);
    });

    it('Should not allow non-burner to burn tokens', async function () {
      await expect(
        voiceToken.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.be.reverted;
    });

    it('Should not allow burning from zero address', async function () {
      await expect(
        voiceToken.connect(burner).burnFrom(ethers.constants.AddressZero, burnAmount)
      ).to.be.revertedWithCustomError(voiceToken, 'ZeroAddress');
    });

    it('Should not allow burning zero amount', async function () {
      await expect(
        voiceToken.connect(burner).burnFrom(user1.address, 0)
      ).to.be.revertedWithCustomError(voiceToken, 'ZeroAmount');
    });

    it('Should not allow burning more than balance', async function () {
      const excessAmount = mintAmount.add(ethers.utils.parseEther('1'));
      await expect(
        voiceToken.connect(burner).burnFrom(user1.address, excessAmount)
      ).to.be.revertedWithCustomError(voiceToken, 'InsufficientBalance');
    });

    it('Should update total supply after burning', async function () {
      await voiceToken.connect(burner).burnFrom(user1.address, burnAmount);
      expect(await voiceToken.totalSupply()).to.equal(mintAmount.sub(burnAmount));
    });

    it('Should allow users to burn their own tokens', async function () {
      await voiceToken.connect(user1).burn(burnAmount);
      expect(await voiceToken.balanceOf(user1.address)).to.equal(mintAmount.sub(burnAmount));
    });
  });

  describe('Bridge Operations', function () {
    const bridgeAmount = ethers.utils.parseEther('500');
    const destinationChainId = 137;
    const sourceChainId = 1;

    beforeEach(async function () {
      await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('1000'));
    });

    it('Should allow bridge to transfer tokens out', async function () {
      const balanceBefore = await voiceToken.balanceOf(user1.address);
      await voiceToken.connect(bridge).bridgeTransfer(user1.address, bridgeAmount, destinationChainId);
      expect(await voiceToken.balanceOf(user1.address)).to.equal(balanceBefore.sub(bridgeAmount));
    });

    it('Should emit BridgeTransfer event on transfer out', async function () {
      await expect(
        voiceToken.connect(bridge).bridgeTransfer(user1.address, bridgeAmount, destinationChainId)
      )
        .to.emit(voiceToken, 'BridgeTransfer')
        .withArgs(user1.address, ethers.constants.AddressZero, bridgeAmount, destinationChainId);
    });

    it('Should revert bridge transfer when balance is insufficient', async function () {
      await expect(
        voiceToken.connect(bridge).bridgeTransfer(user2.address, bridgeAmount, destinationChainId)
      ).to.be.revertedWithCustomError(voiceToken, 'InsufficientBalance');
    });

    it('Should allow bridge to receive tokens', async function () {
      const balanceBefore = await voiceToken.balanceOf(user2.address);
      await voiceToken.connect(bridge).bridgeReceive(user2.address, bridgeAmount, sourceChainId);
      expect(await voiceToken.balanceOf(user2.address)).to.equal(balanceBefore.add(bridgeAmount));
    });

    it('Should emit BridgeTransfer event on receive', async function () {
      await expect(
        voiceToken.connect(bridge).bridgeReceive(user2.address, bridgeAmount, sourceChainId)
      )
        .to.emit(voiceToken, 'BridgeTransfer')
        .withArgs(ethers.constants.AddressZero, user2.address, bridgeAmount, sourceChainId);
    });

    it('Should not allow non-bridge to transfer out', async function () {
      await expect(
        voiceToken.connect(user1).bridgeTransfer(user1.address, bridgeAmount, destinationChainId)
      ).to.be.reverted;
    });

    it('Should not allow non-bridge to receive', async function () {
      await expect(
        voiceToken.connect(user1).bridgeReceive(user2.address, bridgeAmount, sourceChainId)
      ).to.be.reverted;
    });

    it('Should respect supply cap on bridge receive', async function () {
      const remainingBefore = await voiceToken.remainingMintableSupply();
      const buffer = ethers.utils.parseEther('100');
      await voiceToken.connect(minter).mint(user3.address, remainingBefore.sub(buffer));
      
      await expect(
        voiceToken.connect(bridge).bridgeReceive(user2.address, buffer.mul(2), sourceChainId)
      ).to.be.revertedWithCustomError(voiceToken, 'SupplyCapExceeded');
    });

    it('Should not allow bridging zero amount', async function () {
      await expect(
        voiceToken.connect(bridge).bridgeTransfer(user1.address, 0, destinationChainId)
      ).to.be.revertedWithCustomError(voiceToken, 'ZeroAmount');
    });
  });

  describe('Pausable Emergency Controls', function () {
    const amount = ethers.utils.parseEther('100');

    beforeEach(async function () {
      await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('1000'));
    });

    it('Should allow admin to pause', async function () {
      await voiceToken.connect(admin).emergencyPause('Security incident');
      expect(await voiceToken.paused()).to.be.true;
    });

    it('Should emit EmergencyPause event', async function () {
      await expect(voiceToken.connect(admin).emergencyPause('Security incident'))
        .to.emit(voiceToken, 'EmergencyPause')
        .withArgs(admin.address, 'Security incident');
    });

    it('Should not allow non-admin to pause', async function () {
      await expect(
        voiceToken.connect(user1).emergencyPause('Unauthorized')
      ).to.be.reverted;
    });

    it('Should prevent transfers when paused', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await expect(
        voiceToken.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWithCustomError(voiceToken, 'EnforcedPause');
    });

    it('Should prevent minting when paused', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await expect(
        voiceToken.connect(minter).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(voiceToken, 'EnforcedPause');
    });

    it('Should prevent bridge operations when paused', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await expect(
        voiceToken.connect(bridge).bridgeTransfer(user1.address, amount, 137)
      ).to.be.revertedWithCustomError(voiceToken, 'EnforcedPause');
    });

    it('Should prevent burning when paused', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await expect(
        voiceToken.connect(burner).burnFrom(user1.address, amount)
      ).to.be.revertedWithCustomError(voiceToken, 'EnforcedPause');
    });

    it('Should allow admin to unpause', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await voiceToken.connect(admin).emergencyUnpause();
      expect(await voiceToken.paused()).to.be.false;
    });

    it('Should emit EmergencyUnpause event', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await expect(voiceToken.connect(admin).emergencyUnpause())
        .to.emit(voiceToken, 'EmergencyUnpause')
        .withArgs(admin.address);
    });

    it('Should allow operations after unpause', async function () {
      await voiceToken.connect(admin).emergencyPause('Test pause');
      await voiceToken.connect(admin).emergencyUnpause();
      await voiceToken.connect(user1).transfer(user2.address, amount);
      expect(await voiceToken.balanceOf(user2.address)).to.equal(amount);
    });
  });

  describe('EIP-2612 Permit', function () {
    const amount = ethers.utils.parseEther('100');

    it('Should have correct domain separator', async function () {
      const domain = await voiceToken.DOMAIN_SEPARATOR();
      expect(domain).to.not.equal(ethers.constants.HashZero);
    });

    it('Should allow gasless approval via permit', async function () {
      const deadline = (await time.latest()) + 3600;
      const nonce = await voiceToken.nonces(user1.address);

      const domain = {
        name: await voiceToken.name(),
        version: '1',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: voiceToken.address,
      };

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };

      const value = {
        owner: user1.address,
        spender: user2.address,
        value: amount,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await user1._signTypedData(domain, types, value);
      const { v, r, s } = ethers.utils.splitSignature(signature);

      await voiceToken.permit(user1.address, user2.address, amount, deadline, v, r, s);

      expect(await voiceToken.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it('Should increment nonce after permit', async function () {
      const deadline = (await time.latest()) + 3600;
      const nonceBefore = await voiceToken.nonces(user1.address);

      const domain = {
        name: await voiceToken.name(),
        version: '1',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: voiceToken.address,
      };

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };

      const value = {
        owner: user1.address,
        spender: user2.address,
        value: amount,
        nonce: nonceBefore,
        deadline: deadline,
      };

      const signature = await user1._signTypedData(domain, types, value);
      const { v, r, s } = ethers.utils.splitSignature(signature);

      await voiceToken.permit(user1.address, user2.address, amount, deadline, v, r, s);

      expect(await voiceToken.nonces(user1.address)).to.equal(nonceBefore.add(1));
    });
  });

  describe('Batch Transfer', function () {
    const initialBalance = ethers.utils.parseEther('10000');

    beforeEach(async function () {
      await voiceToken.connect(minter).mint(user1.address, initialBalance);
    });

    it('Should allow batch transfers', async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')];

      await voiceToken.connect(user1).batchTransfer(recipients, amounts);

      expect(await voiceToken.balanceOf(user2.address)).to.equal(amounts[0]);
      expect(await voiceToken.balanceOf(user3.address)).to.equal(amounts[1]);
      expect(await voiceToken.balanceOf(user1.address)).to.equal(
        initialBalance.sub(amounts[0]).sub(amounts[1])
      );
    });

    it('Should revert if arrays have different lengths', async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.utils.parseEther('100')];

      await expect(
        voiceToken.connect(user1).batchTransfer(recipients, amounts)
      ).to.be.revertedWithCustomError(voiceToken, 'ArrayLengthMismatch');
    });

    it('Should revert if arrays are empty', async function () {
      await expect(
        voiceToken.connect(user1).batchTransfer([], [])
      ).to.be.revertedWithCustomError(voiceToken, 'EmptyBatch');
    });

    it('Should skip zero amount transfers', async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.utils.parseEther('0'), ethers.utils.parseEther('100')];

      await voiceToken.connect(user1).batchTransfer(recipients, amounts);

      expect(await voiceToken.balanceOf(user2.address)).to.equal(0);
      expect(await voiceToken.balanceOf(user3.address)).to.equal(amounts[1]);
    });

    it('Should revert if any recipient is zero address', async function () {
      const recipients = [ethers.constants.AddressZero, user3.address];
      const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')];

      await expect(
        voiceToken.connect(user1).batchTransfer(recipients, amounts)
      ).to.be.revertedWithCustomError(voiceToken, 'ZeroAddress');
    });

    it('Should not allow batch transfer when paused', async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')];

      await voiceToken.connect(admin).emergencyPause('Test pause');

      await expect(
        voiceToken.connect(user1).batchTransfer(recipients, amounts)
      ).to.be.revertedWithCustomError(voiceToken, 'EnforcedPause');
    });
  });

  describe('Standard ERC20 Operations', function () {
    const mintAmount = ethers.utils.parseEther('1000');
    const transferAmount = ethers.utils.parseEther('100');

    beforeEach(async function () {
      await voiceToken.connect(minter).mint(user1.address, mintAmount);
    });

    it('Should allow transfers', async function () {
      await voiceToken.connect(user1).transfer(user2.address, transferAmount);
      expect(await voiceToken.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it('Should allow approvals', async function () {
      await voiceToken.connect(user1).approve(user2.address, transferAmount);
      expect(await voiceToken.allowance(user1.address, user2.address)).to.equal(transferAmount);
    });

    it('Should allow transferFrom with approval', async function () {
      await voiceToken.connect(user1).approve(user2.address, transferAmount);
      await voiceToken.connect(user2).transferFrom(user1.address, user3.address, transferAmount);
      expect(await voiceToken.balanceOf(user3.address)).to.equal(transferAmount);
    });

    it('Should emit Transfer event', async function () {
      await expect(voiceToken.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(voiceToken, 'Transfer')
        .withArgs(user1.address, user2.address, transferAmount);
    });

    it('Should emit Approval event', async function () {
      await expect(voiceToken.connect(user1).approve(user2.address, transferAmount))
        .to.emit(voiceToken, 'Approval')
        .withArgs(user1.address, user2.address, transferAmount);
    });
  });

  describe('Gas Usage', function () {
    it('Should mint with reasonable gas', async function () {
      const tx = await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('1000'));
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it('Should transfer with reasonable gas', async function () {
      await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('1000'));
      const tx = await voiceToken.connect(user1).transfer(user2.address, ethers.utils.parseEther('100'));
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lt(120000);
    });

    it('Should burn with reasonable gas', async function () {
      await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('1000'));
      const tx = await voiceToken.connect(burner).burnFrom(user1.address, ethers.utils.parseEther('100'));
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lt(120000);
    });
  });

  describe('RewardEngine Backwards Compatibility', function () {
    it('Should support standard ERC20 interface for RewardEngine', async function () {
      expect(await voiceToken.name()).to.be.a('string');
      expect(await voiceToken.symbol()).to.be.a('string');
      expect(await voiceToken.decimals()).to.equal(18);
      expect(await voiceToken.totalSupply()).to.be.a('object');
    });

    it('Should allow minting for reward distributions', async function () {
      const rewardAmount = ethers.utils.parseEther('50');
      await voiceToken.connect(minter).mint(user1.address, rewardAmount);
      expect(await voiceToken.balanceOf(user1.address)).to.equal(rewardAmount);
    });

    it('Should support batch minting for multiple users', async function () {
      const users = [user1.address, user2.address, user3.address];
      const amounts = users.map(() => ethers.utils.parseEther('50'));

      for (let i = 0; i < users.length; i++) {
        await voiceToken.connect(minter).mint(users[i], amounts[i]);
      }

      for (let i = 0; i < users.length; i++) {
        expect(await voiceToken.balanceOf(users[i])).to.equal(amounts[i]);
      }
    });

    it('Should provide balance queries for wallet display', async function () {
      await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('123.45'));
      const balance = await voiceToken.balanceOf(user1.address);
      expect(ethers.utils.formatEther(balance)).to.equal('123.45');
    });

    it('Should support allowance pattern for claiming', async function () {
      await voiceToken.connect(minter).mint(user1.address, ethers.utils.parseEther('1000'));
      await voiceToken.connect(user1).approve(user2.address, ethers.utils.parseEther('500'));
      
      const allowance = await voiceToken.allowance(user1.address, user2.address);
      expect(allowance).to.equal(ethers.utils.parseEther('500'));
    });
  });
});
