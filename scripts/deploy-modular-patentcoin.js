const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying PatentCoin Modular System...");

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
  // 注意：RoleManager.initialize 第一个参数是 _patentCoinContract，但此时主合约还未部署
  // 先用 deployer 地址作为占位符，后续会通过 setPatentCoinContract 更新
  console.log("部署 RoleManager...");
  console.log("初始化参数:", {
    patentCoinContract: deployer.address,
    admin: multisigAddresses.admin,
    minter: multisigAddresses.minter,
    burner: multisigAddresses.burner,
    pauser: multisigAddresses.pauser,
    resumer: multisigAddresses.resumer,
    freezer: multisigAddresses.freezer,
    whitelister: multisigAddresses.whitelister,
    blacklister: multisigAddresses.blacklister,
    upgrader: multisigAddresses.upgrader,
    patentManager: multisigAddresses.patentManager,
    revenueManager: multisigAddresses.revenueManager,
    reserveManager: multisigAddresses.reserveManager,
    redemptionProcessor: multisigAddresses.redemptionProcessor
  });
  
  const RoleManager = await ethers.getContractFactory("RoleManager");
  let roleManager;
  try {
    roleManager = await upgrades.deployProxy(
      RoleManager,
      [
        deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
        multisigAddresses.admin, // admin
        multisigAddresses.minter, // minterMultisig
        multisigAddresses.burner, // burnerMultisig
        multisigAddresses.pauser, // pauserMultisig
        multisigAddresses.resumer, // resumerMultisig
        multisigAddresses.freezer, // freezerMultisig
        multisigAddresses.whitelister, // whitelisterMultisig
        multisigAddresses.blacklister, // blacklisterMultisig
        multisigAddresses.upgrader, // upgraderMultisig
        multisigAddresses.patentManager, // patentManagerMultisig
        multisigAddresses.revenueManager, // revenueManagerMultisig
        multisigAddresses.reserveManager, // reserveManagerMultisig
        multisigAddresses.redemptionProcessor // redemptionProcessorMultisig
      ],
      { 
        kind: 'transparent', // 模块合约使用 transparent 代理
        initializer: 'initialize'
      }
    );
  await roleManager.waitForDeployment();
  console.log("RoleManager deployed to:", await roleManager.getAddress());
  } catch (error) {
    console.error("RoleManager 部署失败:", error.message);
    if (error.data) {
      console.error("错误数据:", error.data);
    }
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
    // 尝试获取更详细的错误信息
    if (error.transaction) {
      console.error("交易哈希:", error.transaction.hash);
    }
    throw error;
  }

  // 2. 部署合规管理器
  console.log("部署 ComplianceManager...");
  const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
  const complianceManager = await upgrades.deployProxy(ComplianceManager, [
    deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
    multisigAddresses.admin // admin
  ]);
  await complianceManager.waitForDeployment();
  console.log("ComplianceManager deployed to:", await complianceManager.getAddress());

  // 3. 部署专利资产管理器
  console.log("部署 PatentAssetManager...");
  const PatentAssetManager = await ethers.getContractFactory("PatentAssetManager");
  const patentAssetManager = await upgrades.deployProxy(PatentAssetManager, [
    deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
    multisigAddresses.admin // admin
  ]);
  await patentAssetManager.waitForDeployment();
  console.log("PatentAssetManager deployed to:", await patentAssetManager.getAddress());

  // 4. 部署储备资产管理器
  console.log("部署 ReserveAssetManager...");
  const ReserveAssetManager = await ethers.getContractFactory("ReserveAssetManager");
  const reserveAssetManager = await upgrades.deployProxy(ReserveAssetManager, [
    deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
    multisigAddresses.admin // admin
  ]);
  await reserveAssetManager.waitForDeployment();
  console.log("ReserveAssetManager deployed to:", await reserveAssetManager.getAddress());

  // 5. 部署收益分配器
  console.log("部署 RevenueDistributor...");
  const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor");
  const revenueDistributor = await upgrades.deployProxy(RevenueDistributor, [
    deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
    multisigAddresses.admin, // admin
    multisigAddresses.treasury // _treasuryAddress
  ]);
  await revenueDistributor.waitForDeployment();
  console.log("RevenueDistributor deployed to:", await revenueDistributor.getAddress());

  // 6. 部署赎回管理器
  console.log("部署 RedemptionManager...");
  const RedemptionManager = await ethers.getContractFactory("RedemptionManager");
  const redemptionManager = await upgrades.deployProxy(RedemptionManager, [
    deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
    multisigAddresses.admin, // admin
    multisigAddresses.feeRecipient // _feeRecipient
  ]);
  await redemptionManager.waitForDeployment();
  console.log("RedemptionManager deployed to:", await redemptionManager.getAddress());

  // 7. 部署审计日志器
  console.log("部署 AuditLogger...");
  const AuditLogger = await ethers.getContractFactory("AuditLogger");
  const auditLogger = await upgrades.deployProxy(AuditLogger, [
    deployer.address, // _patentCoinContract: 临时占位地址，后续会更新
    multisigAddresses.admin // admin
  ]);
  await auditLogger.waitForDeployment();
  console.log("AuditLogger deployed to:", await auditLogger.getAddress());

  console.log("\n=== 部署主合约 ===");

  // 8. 部署主合约
  console.log("部署 PatentCoinModular...");
  const PatentCoinModular = await ethers.getContractFactory("PatentCoinModular");
  const patentCoin = await upgrades.deployProxy(PatentCoinModular, [
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
  await patentCoin.waitForDeployment();
  console.log("PatentCoinModular deployed to:", await patentCoin.getAddress());

  console.log("\n=== 更新模块引用 ===");

  // 9. 更新所有模块的PatentCoin合约地址
  const patentCoinAddress = await patentCoin.getAddress();
  
  console.log("更新 RoleManager 引用...");
  await roleManager.setPatentCoinContract(patentCoinAddress);
  
  console.log("更新 ComplianceManager 引用...");
  await complianceManager.setPatentCoinContract(patentCoinAddress);
  
  console.log("更新 PatentAssetManager 引用...");
  await patentAssetManager.setPatentCoinContract(patentCoinAddress);
  
  console.log("更新 ReserveAssetManager 引用...");
  await reserveAssetManager.setPatentCoinContract(patentCoinAddress);
  
  console.log("更新 RevenueDistributor 引用...");
  await revenueDistributor.setPatentCoinContract(patentCoinAddress);
  
  console.log("更新 RedemptionManager 引用...");
  await redemptionManager.setPatentCoinContract(patentCoinAddress);
  
  console.log("更新 AuditLogger 引用...");
  await auditLogger.setPatentCoinContract(patentCoinAddress);

  console.log("\n=== 同步角色到主合约 ===");
  // 主合约和 RoleManager 是独立的 AccessControl 实例，需要在主合约中也授予角色
  // 从 RoleManager 获取各角色的多签地址，然后在主合约中授予相应角色
  
  const MINTER_ROLE = await patentCoin.MINTER_ROLE();
  const BURNER_ROLE = await patentCoin.BURNER_ROLE();
  const PAUSER_ROLE = await patentCoin.PAUSER_ROLE();
  const RESUME_ROLE = await patentCoin.RESUME_ROLE();
  const FREEZER_ROLE = await patentCoin.FREEZER_ROLE();
  const WHITELISTER_ROLE = await patentCoin.WHITELISTER_ROLE();
  const BLACKLISTER_ROLE = await patentCoin.BLACKLISTER_ROLE();
  const UPGRADER_ROLE = await patentCoin.UPGRADER_ROLE();
  const PATENT_MANAGER_ROLE = await patentCoin.PATENT_MANAGER_ROLE();
  const REVENUE_MANAGER_ROLE = await patentCoin.REVENUE_MANAGER_ROLE();
  const RESERVE_MANAGER_ROLE = await patentCoin.RESERVE_MANAGER_ROLE();
  const REDEMPTION_PROCESSOR_ROLE = await patentCoin.REDEMPTION_PROCESSOR_ROLE();

  // 从 RoleManager 获取各角色的多签地址
  const minterMultisig = await roleManager.getRoleMultisigWallet(MINTER_ROLE);
  const burnerMultisig = await roleManager.getRoleMultisigWallet(BURNER_ROLE);
  const pauserMultisig = await roleManager.getRoleMultisigWallet(PAUSER_ROLE);
  const resumerMultisig = await roleManager.getRoleMultisigWallet(RESUME_ROLE);
  const freezerMultisig = await roleManager.getRoleMultisigWallet(FREEZER_ROLE);
  const whitelisterMultisig = await roleManager.getRoleMultisigWallet(WHITELISTER_ROLE);
  const blacklisterMultisig = await roleManager.getRoleMultisigWallet(BLACKLISTER_ROLE);
  const upgraderMultisig = await roleManager.getRoleMultisigWallet(UPGRADER_ROLE);
  const patentManagerMultisig = await roleManager.getRoleMultisigWallet(PATENT_MANAGER_ROLE);
  const revenueManagerMultisig = await roleManager.getRoleMultisigWallet(REVENUE_MANAGER_ROLE);
  const reserveManagerMultisig = await roleManager.getRoleMultisigWallet(RESERVE_MANAGER_ROLE);
  const redemptionProcessorMultisig = await roleManager.getRoleMultisigWallet(REDEMPTION_PROCESSOR_ROLE);

  // 在主合约中授予角色（使用 admin 账户，因为 admin 有 DEFAULT_ADMIN_ROLE）
  console.log("授予 MINTER_ROLE 给主合约...");
  await patentCoin.grantRole(MINTER_ROLE, minterMultisig);
  
  console.log("授予 BURNER_ROLE 给主合约...");
  await patentCoin.grantRole(BURNER_ROLE, burnerMultisig);
  
  console.log("授予 PAUSER_ROLE 给主合约...");
  await patentCoin.grantRole(PAUSER_ROLE, pauserMultisig);
  
  console.log("授予 RESUME_ROLE 给主合约...");
  await patentCoin.grantRole(RESUME_ROLE, resumerMultisig);
  
  console.log("授予 FREEZER_ROLE 给主合约...");
  await patentCoin.grantRole(FREEZER_ROLE, freezerMultisig);
  
  console.log("授予 WHITELISTER_ROLE 给主合约...");
  await patentCoin.grantRole(WHITELISTER_ROLE, whitelisterMultisig);
  
  console.log("授予 BLACKLISTER_ROLE 给主合约...");
  await patentCoin.grantRole(BLACKLISTER_ROLE, blacklisterMultisig);
  
  console.log("授予 UPGRADER_ROLE 给主合约...");
  await patentCoin.grantRole(UPGRADER_ROLE, upgraderMultisig);
  
  console.log("授予 PATENT_MANAGER_ROLE 给主合约...");
  await patentCoin.grantRole(PATENT_MANAGER_ROLE, patentManagerMultisig);
  
  console.log("授予 REVENUE_MANAGER_ROLE 给主合约...");
  await patentCoin.grantRole(REVENUE_MANAGER_ROLE, revenueManagerMultisig);
  
  console.log("授予 RESERVE_MANAGER_ROLE 给主合约...");
  await patentCoin.grantRole(RESERVE_MANAGER_ROLE, reserveManagerMultisig);
  
  console.log("授予 REDEMPTION_PROCESSOR_ROLE 给主合约...");
  await patentCoin.grantRole(REDEMPTION_PROCESSOR_ROLE, redemptionProcessorMultisig);

  console.log("\n=== 部署完成 ===");
  console.log("PatentCoin Modular System deployed successfully!");
  console.log("\n合约地址:");
  console.log("PatentCoinModular:", patentCoinAddress);
  console.log("RoleManager:", await roleManager.getAddress());
  console.log("ComplianceManager:", await complianceManager.getAddress());
  console.log("PatentAssetManager:", await patentAssetManager.getAddress());
  console.log("ReserveAssetManager:", await reserveAssetManager.getAddress());
  console.log("RevenueDistributor:", await revenueDistributor.getAddress());
  console.log("RedemptionManager:", await redemptionManager.getAddress());
  console.log("AuditLogger:", await auditLogger.getAddress());

  console.log("\n=== 验证部署 ===");
  console.log("Token Name:", await patentCoin.name());
  console.log("Token Symbol:", await patentCoin.symbol());
  console.log("Version:", await patentCoin.version());
  console.log("Max Supply:", ethers.formatEther(await patentCoin.maxSupply()));
  console.log("Total Supply:", ethers.formatEther(await patentCoin.totalSupply()), "(初始为 0，需要铸造)");
  
  // 验证角色授予
  console.log("\n=== 验证角色授予 ===");
  const deployerHasMinterRole = await patentCoin.hasRole(MINTER_ROLE, deployer.address);
  console.log("Deployer has MINTER_ROLE in main contract:", deployerHasMinterRole);

  return {
    patentCoin: patentCoinAddress,
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
