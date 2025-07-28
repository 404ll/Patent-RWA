const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GuideCoinModular - Basic Compilation Test", function () {
  let admin, minter, treasury;

  beforeEach(async function () {
    [admin, minter, treasury] = await ethers.getSigners();
  });

  describe("Contract Compilation", function () {
    it("Should be able to get contract factories", async function () {
      const GuideCoinModular = await ethers.getContractFactory("GuideCoinModular");
      const RoleManager = await ethers.getContractFactory("RoleManager");
      const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
      const PatentAssetManager = await ethers.getContractFactory("PatentAssetManager");
      const ReserveAssetManager = await ethers.getContractFactory("ReserveAssetManager");
      const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor");
      const RedemptionManager = await ethers.getContractFactory("RedemptionManager");
      const AuditLogger = await ethers.getContractFactory("AuditLogger");

      expect(GuideCoinModular).to.not.be.undefined;
      expect(RoleManager).to.not.be.undefined;
      expect(ComplianceManager).to.not.be.undefined;
      expect(PatentAssetManager).to.not.be.undefined;
      expect(ReserveAssetManager).to.not.be.undefined;
      expect(RevenueDistributor).to.not.be.undefined;
      expect(RedemptionManager).to.not.be.undefined;
      expect(AuditLogger).to.not.be.undefined;
    });

    it("Should have correct contract bytecode", async function () {
      const GuideCoinModular = await ethers.getContractFactory("GuideCoinModular");
      expect(GuideCoinModular.bytecode).to.not.be.empty;
      expect(GuideCoinModular.bytecode.length).to.be.greaterThan(2); // More than just "0x"
    });
  });

  describe("Interface Verification", function () {
    it("Should have all required interfaces compiled", async function () {
      // 检查接口文件是否存在于artifacts中
      const fs = require('fs');
      const path = require('path');

      const interfacePath = path.join(__dirname, '../artifacts/contracts/interfaces/IGuideCoinModules.sol');
      expect(fs.existsSync(interfacePath)).to.be.true;
    });
  });
});
