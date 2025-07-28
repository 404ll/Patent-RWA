const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GuideCoin", function () {
  let guideCoin;
  let admin, minter, burner, pauser, resumer, blacklister, freezer, upgrader;
  let user1, user2;

  beforeEach(async function () {
    [admin, minter, burner, pauser, resumer, blacklister, freezer, upgrader, user1, user2] = await ethers.getSigners();

    const GuideCoin = await ethers.getContractFactory("GuideCoin");
    guideCoin = await upgrades.deployProxy(
      GuideCoin,
      [
        admin.address,
        minter.address,
        pauser.address,
        resumer.address,
        blacklister.address,
        freezer.address,
        upgrader.address
      ],
      { kind: "uups", initializer: "initialize" }
    );
    await guideCoin.deployed();
  });

  describe("Initialization", function () {
    it("Should have correct name and symbol", async function () {
      expect(await guideCoin.name()).to.equal("GUIDE Coin");
      expect(await guideCoin.symbol()).to.equal("GUIDE");
    });

    it("Should assign roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await guideCoin.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await guideCoin.MINTER_ROLE();
      const PAUSER_ROLE = await guideCoin.PAUSER_ROLE();
      const RESUME_ROLE = await guideCoin.RESUME_ROLE();
      const BLACKLISTER_ROLE = await guideCoin.BLACKLISTER_ROLE();
      const FREEZER_ROLE = await guideCoin.FREEZER_ROLE();
      const UPGRADER_ROLE = await guideCoin.UPGRADER_ROLE();

      expect(await guideCoin.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await guideCoin.hasRole(MINTER_ROLE, minter.address)).to.be.true;
      expect(await guideCoin.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
      expect(await guideCoin.hasRole(RESUME_ROLE, resumer.address)).to.be.true;
      expect(await guideCoin.hasRole(BLACKLISTER_ROLE, blacklister.address)).to.be.true;
      expect(await guideCoin.hasRole(FREEZER_ROLE, freezer.address)).to.be.true;
      expect(await guideCoin.hasRole(UPGRADER_ROLE, upgrader.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const amount = ethers.utils.parseEther("1000");
      
      await expect(guideCoin.connect(minter).mint(user1.address, amount))
        .to.emit(guideCoin, "TokensMinted")
        .withArgs(user1.address, amount, minter.address);

      expect(await guideCoin.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should not allow non-minter to mint tokens", async function () {
      const amount = ethers.utils.parseEther("1000");
      
      await expect(guideCoin.connect(user1).mint(user2.address, amount))
        .to.be.revertedWith("AccessControl:");
    });
  });

  describe("Blacklisting", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1000");
      await guideCoin.connect(minter).mint(user1.address, amount);
    });

    it("Should allow blacklister to blacklist addresses", async function () {
      await expect(guideCoin.connect(blacklister).addToBlacklist(user1.address))
        .to.emit(guideCoin, "AddressBlacklisted")
        .withArgs(user1.address, blacklister.address);

      expect(await guideCoin.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should prevent blacklisted addresses from transferring", async function () {
      await guideCoin.connect(blacklister).addToBlacklist(user1.address);
      
      const amount = ethers.utils.parseEther("100");
      await expect(guideCoin.connect(user1).transfer(user2.address, amount))
        .to.be.revertedWith("GuideCoin: sender is blacklisted");
    });

    it("Should allow removing from blacklist", async function () {
      await guideCoin.connect(blacklister).addToBlacklist(user1.address);
      
      await expect(guideCoin.connect(blacklister).removeFromBlacklist(user1.address))
        .to.emit(guideCoin, "AddressUnblacklisted")
        .withArgs(user1.address, blacklister.address);

      expect(await guideCoin.isBlacklisted(user1.address)).to.be.false;
    });
  });

  describe("Freezing", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1000");
      await guideCoin.connect(minter).mint(user1.address, amount);
    });

    it("Should allow freezer to freeze addresses", async function () {
      await expect(guideCoin.connect(freezer).freezeAddress(user1.address))
        .to.emit(guideCoin, "AddressFrozen")
        .withArgs(user1.address, freezer.address);

      expect(await guideCoin.isFrozen(user1.address)).to.be.true;
    });

    it("Should prevent frozen addresses from transferring", async function () {
      await guideCoin.connect(freezer).freezeAddress(user1.address);
      
      const amount = ethers.utils.parseEther("100");
      await expect(guideCoin.connect(user1).transfer(user2.address, amount))
        .to.be.revertedWith("GuideCoin: sender is frozen");
    });
  });

  describe("Pausable", function () {
    it("Should allow pauser to pause contract", async function () {
      await expect(guideCoin.connect(pauser).pause())
        .to.emit(guideCoin, "ContractPaused")
        .withArgs(pauser.address);

      expect(await guideCoin.paused()).to.be.true;
    });

    it("Should allow resumer to unpause contract", async function () {
      await guideCoin.connect(pauser).pause();
      
      await expect(guideCoin.connect(resumer).unpause())
        .to.emit(guideCoin, "ContractUnpaused")
        .withArgs(resumer.address);

      expect(await guideCoin.paused()).to.be.false;
    });
  });

  describe("Upgradeability", function () {
    it("Should allow upgrader to upgrade contract", async function () {
      const GuideCoinV2 = await ethers.getContractFactory("GuideCoin");
      
      await expect(upgrades.upgradeProxy(guideCoin.address, GuideCoinV2, { kind: "uups" }))
        .to.not.be.reverted;
    });
  });
});