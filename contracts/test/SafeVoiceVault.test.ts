import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import type { SafeVoiceVault } from '../typechain-types';

describe('SafeVoiceVault', function () {
  let vault: SafeVoiceVault;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let ownerAddress: string;
  let addr1Address: string;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    addr1Address = await addr1.getAddress();

    const SafeVoiceVault = await ethers.getContractFactory('SafeVoiceVault');
    vault = await SafeVoiceVault.deploy();
    await vault.deployed();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await vault.owner()).to.equal(ownerAddress);
    });

    it('Should start unpaused', async function () {
      expect(await vault.paused()).to.equal(false);
    });

    it('Should have correct name', async function () {
      expect(await vault.name()).to.equal('SafeVoice Vault');
    });

    it('Should have correct version', async function () {
      expect(await vault.version()).to.equal('1.0.0');
      expect(await vault.getVersion()).to.equal('1.0.0');
    });
  });

  describe('Pause functionality', function () {
    it('Should allow owner to pause', async function () {
      await vault.pause();
      expect(await vault.paused()).to.equal(true);
    });

    it('Should emit Paused event', async function () {
      await expect(vault.pause())
        .to.emit(vault, 'Paused')
        .withArgs(ownerAddress);
    });

    it('Should not allow non-owner to pause', async function () {
      await expect(vault.connect(addr1).pause())
        .to.be.revertedWith('Not authorized');
    });

    it('Should allow owner to unpause', async function () {
      await vault.pause();
      await vault.unpause();
      expect(await vault.paused()).to.equal(false);
    });

    it('Should emit Unpaused event', async function () {
      await vault.pause();
      await expect(vault.unpause())
        .to.emit(vault, 'Unpaused')
        .withArgs(ownerAddress);
    });

    it('Should not allow pausing when already paused', async function () {
      await vault.pause();
      await expect(vault.pause())
        .to.be.revertedWith('Contract is paused');
    });

    it('Should not allow unpausing when not paused', async function () {
      await expect(vault.unpause())
        .to.be.revertedWith('Contract is not paused');
    });
  });

  describe('Ownership', function () {
    it('Should transfer ownership', async function () {
      await vault.transferOwnership(addr1Address);
      expect(await vault.owner()).to.equal(addr1Address);
    });

    it('Should emit OwnershipTransferred event', async function () {
      await expect(vault.transferOwnership(addr1Address))
        .to.emit(vault, 'OwnershipTransferred')
        .withArgs(ownerAddress, addr1Address);
    });

    it('Should not allow non-owner to transfer ownership', async function () {
      await expect(vault.connect(addr1).transferOwnership(addr1Address))
        .to.be.revertedWith('Not authorized');
    });

    it('Should not allow transfer to zero address', async function () {
      await expect(vault.transferOwnership(ethers.constants.AddressZero))
        .to.be.revertedWith('Invalid address');
    });
  });
});
