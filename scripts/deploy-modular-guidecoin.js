const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying GuideCoin Modular System...");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 模拟多签钱包地址（在实际部署中应该是真实的多签钱包）
  const multisigAddresses = {
    admin: deployer.address,
    minter: deployer.address,
    burner: deployer.address,
    pauser: deployer.address,
    resumer: deployer.address,
    freezer: deployer.address,
    whitelister: deployer.address,
    blacklister: deployer.address,
    upgrader: deployer.address,
    patentManager: deployer.address,
    revenueManager: deployer.address,
    reserveManager: deployer.address,
    redemptionProcessor: deployer.address,
    treasury: deployer.address,
    feeRecipient: deployer.address
  };

  console.log("\n=== 部署模块合约 ===");

  // 1. 部署角色管理器
  console.log("部署 RoleManager...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await upgrades.deployProxy(RoleManager, [
    multisigAddresses.admin, // 临时使用admin地址
    multisigAddresses.admin,
    multisigAddresses.minter,
    multisigAddresses.burner,
    multisigAddresses.pauser,
    multisigAddresses.resumer,
    multisigAddresses.freezer,
    multisigAddresses.whitelister,
    multisigAddresses.blacklister,
    multisigAddresses.upgrader,
    multisigAddresses.patentManager,
    multisigAddresses.revenueManager,
    multisigAddresses.reserveManager,
    multisigAddresses.redemptionProcessor
  ]);
  await roleManager.waitForDeployment();
  console.log("RoleManager deployed to:", await roleManager.getAddress());

  // 2. 部署合规管理器
  console.log("部署 ComplianceManager...");
  const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
  const complianceManager = await upgrades.deployProxy(ComplianceManager, [
    multisigAddresses.admin,
    multisigAddresses.admin
  ]);
  await complianceManager.waitForDeployment();
  console.log("ComplianceManager deployed to:", await complianceManager.getAddress());

  // 3. 部署专利资产管理器
  console.log("部署 PatentAssetManager...");
  const PatentAssetManager = await ethers.getContractFactory("PatentAssetManager");
  const patentAssetManager = await upgrades.deployProxy(PatentAssetManager, [
    multisigAddresses.admin,
    multisigAddresses.admin
  ]);
  await patentAssetManager.waitForDeployment();
  console.log("PatentAssetManager deployed to:", await patentAssetManager.getAddress());

  // 4. 部署储备资产管理器
  console.log("部署 ReserveAssetManager...");
  const ReserveAssetManager = await ethers.getContractFactory("ReserveAssetManager");
  const reserveAssetManager = await upgrades.deployProxy(ReserveAssetManager, [
    multisigAddresses.admin,
    multisigAddresses.admin
  ]);
  await reserveAssetManager.waitForDeployment();
  console.log("ReserveAssetManager deployed to:", await reserveAssetManager.getAddress());

  // 5. 部署收益分配器
  console.log("部署 RevenueDistributor...");
  const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor");
  const revenueDistributor = await upgrades.deployProxy(RevenueDistributor, [
    multisigAddresses.admin,
    multisigAddresses.admin,
    multisigAddresses.treasury
  ]);
  await revenueDistributor.waitForDeployment();
  console.log("RevenueDistributor deployed to:", await revenueDistributor.getAddress());

  // 6. 部署赎回管理器
  console.log("部署 RedemptionManager...");
  const RedemptionManager = await ethers.getContractFactory("RedemptionManager");
  const redemptionManager = await upgrades.deployProxy(RedemptionManager, [
    multisigAddresses.admin,
    multisigAddresses.admin,
    multisigAddresses.feeRecipient
  ]);
  await redemptionManager.waitForDeployment();
  console.log("RedemptionManager deployed to:", await redemptionManager.getAddress());

  // 7. 部署审计日志器
  console.log("部署 AuditLogger...");
  const AuditLogger = await ethers.getContractFactory("AuditLogger");
  const auditLogger = await upgrades.deployProxy(AuditLogger, [
    multisigAddresses.admin,
    multisigAddresses.admin
  ]);
  await auditLogger.waitForDeployment();
  console.log("AuditLogger deployed to:", await auditLogger.getAddress());

  console.log("\n=== 部署主合约 ===");

  // 8. 部署主合约
  console.log("部署 GuideCoinModular...");
  const GuideCoinModular = await ethers.getContractFactory("GuideCoinModular");
  const guideCoin = await upgrades.deployProxy(GuideCoinModular, [
    multisigAddresses.admin,
    await roleManager.getAddress(),
    await complianceManager.getAddress(),
    await patentAssetManager.getAddress(),
    await reserveAssetManager.getAddress(),
    await revenueDistributor.getAddress(),
    await redemptionManager.getAddress(),
    await auditLogger.getAddress(),
    multisigAddresses.treasury
  ]);
  await guideCoin.waitForDeployment();
  console.log("GuideCoinModular deployed to:", await guideCoin.getAddress());

  console.log("\n=== 更新模块引用 ===");

  // 9. 更新所有模块的GuideCoin合约地址
  const guideCoinAddress = await guideCoin.getAddress();
  
  console.log("更新 RoleManager 引用...");
  await roleManager.setGuideCoinContract(guideCoinAddress);
  
  console.log("更新 ComplianceManager 引用...");
  await complianceManager.setGuideCoinContract(guideCoinAddress);
  
  console.log("更新 PatentAssetManager 引用...");
  await patentAssetManager.setGuideCoinContract(guideCoinAddress);
  
  console.log("更新 ReserveAssetManager 引用...");
  await reserveAssetManager.setGuideCoinContract(guideCoinAddress);
  
  console.log("更新 RevenueDistributor 引用...");
  await revenueDistributor.setGuideCoinContract(guideCoinAddress);
  
  console.log("更新 RedemptionManager 引用...");
  await redemptionManager.setGuideCoinContract(guideCoinAddress);
  
  console.log("更新 AuditLogger 引用...");
  await auditLogger.setGuideCoinContract(guideCoinAddress);

  console.log("\n=== 部署完成 ===");
  console.log("GuideCoin Modular System deployed successfully!");
  console.log("\n合约地址:");
  console.log("GuideCoinModular:", guideCoinAddress);
  console.log("RoleManager:", await roleManager.getAddress());
  console.log("ComplianceManager:", await complianceManager.getAddress());
  console.log("PatentAssetManager:", await patentAssetManager.getAddress());
  console.log("ReserveAssetManager:", await reserveAssetManager.getAddress());
  console.log("RevenueDistributor:", await revenueDistributor.getAddress());
  console.log("RedemptionManager:", await redemptionManager.getAddress());
  console.log("AuditLogger:", await auditLogger.getAddress());

  console.log("\n=== 验证部署 ===");
  console.log("Token Name:", await guideCoin.name());
  console.log("Token Symbol:", await guideCoin.symbol());
  console.log("Version:", await guideCoin.version());
  console.log("Max Supply:", ethers.formatEther(await guideCoin.maxSupply()));

  return {
    guideCoin: guideCoinAddress,
    roleManager: await roleManager.getAddress(),
    complianceManager: await complianceManager.getAddress(),
    patentAssetManager: await patentAssetManager.getAddress(),
    reserveAssetManager: await reserveAssetManager.getAddress(),
    revenueDistributor: await revenueDistributor.getAddress(),
    redemptionManager: await redemptionManager.getAddress(),
    auditLogger: await auditLogger.getAddress()
  };
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
