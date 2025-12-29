const { ethers } = require("hardhat");

/**
 * 修复角色授予脚本
 * 用于在已部署的合约中同步角色到主合约
 */
async function main() {
  console.log("修复角色授予...");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);

  // 合约地址（从环境变量或部署输出获取）
  const PATENT_COIN_ADDRESS = process.env.PATENT_COIN_ADDRESS || "0xA29057f94EAEda93020664032D4a5A2da2DDa488";
  
  console.log("PatentCoinModular address:", PATENT_COIN_ADDRESS);

  // 获取合约实例
  const patentCoin = await ethers.getContractAt("PatentCoinModular", PATENT_COIN_ADDRESS);
  const roleManagerAddress = await patentCoin.roleManager();
  const roleManager = await ethers.getContractAt("RoleManager", roleManagerAddress);

  console.log("RoleManager address:", roleManagerAddress);

  // 检查是否有管理员权限
  const DEFAULT_ADMIN_ROLE = await patentCoin.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await patentCoin.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (!hasAdminRole) {
    console.error("❌ 错误：部署账户没有 DEFAULT_ADMIN_ROLE");
    console.log("只有管理员才能授予角色");
    process.exit(1);
  }

  console.log("\n=== 同步角色到主合约 ===");
  
  // 获取所有角色常量
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
  const roles = [
    { name: "MINTER_ROLE", role: MINTER_ROLE },
    { name: "BURNER_ROLE", role: BURNER_ROLE },
    { name: "PAUSER_ROLE", role: PAUSER_ROLE },
    { name: "RESUME_ROLE", role: RESUME_ROLE },
    { name: "FREEZER_ROLE", role: FREEZER_ROLE },
    { name: "WHITELISTER_ROLE", role: WHITELISTER_ROLE },
    { name: "BLACKLISTER_ROLE", role: BLACKLISTER_ROLE },
    { name: "UPGRADER_ROLE", role: UPGRADER_ROLE },
    { name: "PATENT_MANAGER_ROLE", role: PATENT_MANAGER_ROLE },
    { name: "REVENUE_MANAGER_ROLE", role: REVENUE_MANAGER_ROLE },
    { name: "RESERVE_MANAGER_ROLE", role: RESERVE_MANAGER_ROLE },
    { name: "REDEMPTION_PROCESSOR_ROLE", role: REDEMPTION_PROCESSOR_ROLE }
  ];

  for (const { name, role } of roles) {
    try {
      const multisigAddress = await roleManager.getRoleMultisigWallet(role);
      console.log(`\n${name}:`);
      console.log("  多签地址:", multisigAddress);
      
      // 检查是否已经在主合约中授予
      const hasRole = await patentCoin.hasRole(role, multisigAddress);
      if (hasRole) {
        console.log("  ✅ 角色已授予");
      } else {
        console.log("  ⚠️  角色未授予，正在授予...");
        const tx = await patentCoin.grantRole(role, multisigAddress);
        await tx.wait();
        console.log("  ✅ 角色已授予");
      }
    } catch (error) {
      console.error(`  ❌ 处理 ${name} 时出错:`, error.message);
    }
  }

  console.log("\n=== 同步角色到模块 ===");
  
  // 获取所有模块地址
  const patentAssetManagerAddress = await patentCoin.patentAssetManager();
  const revenueDistributorAddress = await patentCoin.revenueDistributor();
  const complianceManagerAddress = await patentCoin.complianceManager();
  const reserveAssetManagerAddress = await patentCoin.reserveAssetManager();
  const redemptionManagerAddress = await patentCoin.redemptionManager();
  
  const patentAssetManager = await ethers.getContractAt("PatentAssetManager", patentAssetManagerAddress);
  const revenueDistributor = await ethers.getContractAt("RevenueDistributor", revenueDistributorAddress);
  const complianceManager = await ethers.getContractAt("ComplianceManager", complianceManagerAddress);
  const reserveAssetManager = await ethers.getContractAt("ReserveAssetManager", reserveAssetManagerAddress);
  const redemptionManager = await ethers.getContractAt("RedemptionManager", redemptionManagerAddress);
  
  console.log("PatentAssetManager address:", patentAssetManagerAddress);
  console.log("RevenueDistributor address:", revenueDistributorAddress);
  
  // 获取所有角色的多签地址
  const patentManagerMultisig = await roleManager.getRoleMultisigWallet(PATENT_MANAGER_ROLE);
  const revenueManagerMultisig = await roleManager.getRoleMultisigWallet(REVENUE_MANAGER_ROLE);
  const freezerMultisig = await roleManager.getRoleMultisigWallet(FREEZER_ROLE);
  const whitelisterMultisig = await roleManager.getRoleMultisigWallet(WHITELISTER_ROLE);
  const blacklisterMultisig = await roleManager.getRoleMultisigWallet(BLACKLISTER_ROLE);
  
  // 在 PatentAssetManager 模块中授予角色和设置授权多签
  console.log("\n=== 设置 PatentAssetManager 模块 ===");
  const moduleAdminRole = await patentAssetManager.DEFAULT_ADMIN_ROLE();
  const hasModuleAdminRole = await patentAssetManager.hasRole(moduleAdminRole, deployer.address);
  
  if (hasModuleAdminRole) {
    // 授予角色
    const hasPatentManagerRoleInModule = await patentAssetManager.hasRole(PATENT_MANAGER_ROLE, patentManagerMultisig);
    if (!hasPatentManagerRoleInModule) {
      console.log("授予 PATENT_MANAGER_ROLE 给模块...");
      const tx1 = await patentAssetManager.grantRole(PATENT_MANAGER_ROLE, patentManagerMultisig);
      await tx1.wait();
      console.log("✅ 角色已授予");
    } else {
      console.log("✅ PATENT_MANAGER_ROLE 已在模块中授予");
    }
    
    // 设置授权多签
    const isAuthorizedInModule = await patentAssetManager.isAuthorizedMultisig(patentManagerMultisig);
    if (!isAuthorizedInModule) {
      console.log("设置授权多签...");
      const tx2 = await patentAssetManager.setMultisigAuthorization(patentManagerMultisig, true);
      await tx2.wait();
      console.log("✅ 授权多签已设置");
    } else {
      console.log("✅ 授权多签已设置");
    }
  } else {
    console.log("⚠️  无法设置：需要模块管理员权限");
  }
  
  // 在 RevenueDistributor 模块中授予角色和设置授权多签
  console.log("\n=== 设置 RevenueDistributor 模块 ===");
  const revenueModuleAdminRole = await revenueDistributor.DEFAULT_ADMIN_ROLE();
  const hasRevenueModuleAdminRole = await revenueDistributor.hasRole(revenueModuleAdminRole, deployer.address);
  
  if (hasRevenueModuleAdminRole) {
    // 授予角色给多签地址
    const hasRevenueManagerRoleInModule = await revenueDistributor.hasRole(REVENUE_MANAGER_ROLE, revenueManagerMultisig);
    if (!hasRevenueManagerRoleInModule) {
      console.log("授予 REVENUE_MANAGER_ROLE 给多签地址...");
      const tx1 = await revenueDistributor.grantRole(REVENUE_MANAGER_ROLE, revenueManagerMultisig);
      await tx1.wait();
      console.log("✅ 角色已授予");
    } else {
      console.log("✅ REVENUE_MANAGER_ROLE 已在模块中授予给多签地址");
    }
    
    // 设置授权多签
    const isAuthorizedInRevenueModule = await revenueDistributor.isAuthorizedMultisig(revenueManagerMultisig);
    if (!isAuthorizedInRevenueModule) {
      console.log("设置授权多签...");
      const tx2 = await revenueDistributor.setMultisigAuthorization(revenueManagerMultisig, true);
      await tx2.wait();
      console.log("✅ 授权多签已设置");
    } else {
      console.log("✅ 授权多签已设置");
    }
    
    // ⚠️ 重要：授予角色给主合约地址（因为通过主合约调用时，msg.sender 是主合约地址）
    console.log("\n⚠️  重要：授予角色给主合约地址（通过主合约调用时，msg.sender 是主合约地址）");
    const hasRevenueManagerRoleForMainContract = await revenueDistributor.hasRole(REVENUE_MANAGER_ROLE, PATENT_COIN_ADDRESS);
    if (!hasRevenueManagerRoleForMainContract) {
      console.log("授予 REVENUE_MANAGER_ROLE 给主合约地址...");
      const tx3 = await revenueDistributor.grantRole(REVENUE_MANAGER_ROLE, PATENT_COIN_ADDRESS);
      await tx3.wait();
      console.log("✅ 角色已授予给主合约");
    } else {
      console.log("✅ 主合约已有 REVENUE_MANAGER_ROLE");
    }
    
    // 授权主合约地址为多签钱包
    const isMainContractAuthorized = await revenueDistributor.isAuthorizedMultisig(PATENT_COIN_ADDRESS);
    if (!isMainContractAuthorized) {
      console.log("授权主合约地址为多签钱包...");
      const tx4 = await revenueDistributor.setMultisigAuthorization(PATENT_COIN_ADDRESS, true);
      await tx4.wait();
      console.log("✅ 主合约已授权为多签钱包");
    } else {
      console.log("✅ 主合约已是授权多签钱包");
    }
  } else {
    console.log("⚠️  无法设置：需要模块管理员权限");
  }
  
  // 在 ComplianceManager 模块中设置授权多签
  console.log("\n=== 设置 ComplianceManager 模块 ===");
  const complianceModuleAdminRole = await complianceManager.DEFAULT_ADMIN_ROLE();
  const hasComplianceModuleAdminRole = await complianceManager.hasRole(complianceModuleAdminRole, deployer.address);
  
  if (hasComplianceModuleAdminRole) {
    const multisigs = [freezerMultisig, whitelisterMultisig, blacklisterMultisig];
    const authorizations = [true, true, true];
    
    console.log("批量设置授权多签...");
    const tx = await complianceManager.batchSetMultisigAuthorization(multisigs, authorizations);
    await tx.wait();
    console.log("✅ 授权多签已设置");
  } else {
    console.log("⚠️  无法设置：需要模块管理员权限");
  }
  
  // 在 ReserveAssetManager 模块中授予角色和设置授权多签
  console.log("\n=== 设置 ReserveAssetManager 模块 ===");
  const reserveManagerMultisig = await roleManager.getRoleMultisigWallet(RESERVE_MANAGER_ROLE);
  const reserveModuleAdminRole = await reserveAssetManager.DEFAULT_ADMIN_ROLE();
  const hasReserveModuleAdminRole = await reserveAssetManager.hasRole(reserveModuleAdminRole, deployer.address);
  
  if (hasReserveModuleAdminRole) {
    // 授予角色
    const hasReserveManagerRoleInModule = await reserveAssetManager.hasRole(RESERVE_MANAGER_ROLE, reserveManagerMultisig);
    if (!hasReserveManagerRoleInModule) {
      console.log("授予 RESERVE_MANAGER_ROLE 给模块...");
      const tx1 = await reserveAssetManager.grantRole(RESERVE_MANAGER_ROLE, reserveManagerMultisig);
      await tx1.wait();
      console.log("✅ 角色已授予");
    } else {
      console.log("✅ RESERVE_MANAGER_ROLE 已在模块中授予");
    }
    
    // 设置授权多签
    const isAuthorizedInReserveModule = await reserveAssetManager.isAuthorizedMultisig(reserveManagerMultisig);
    if (!isAuthorizedInReserveModule) {
      console.log("设置授权多签...");
      const tx2 = await reserveAssetManager.setMultisigAuthorization(reserveManagerMultisig, true);
      await tx2.wait();
      console.log("✅ 授权多签已设置");
    } else {
      console.log("✅ 授权多签已设置");
    }
  } else {
    console.log("⚠️  无法设置：需要模块管理员权限");
  }

  console.log("\n=== 授予角色给部署账户 ===");
  console.log("注意：如果部署账户需要直接操作，需要授予角色并授权为多签钱包");
  
  // 检查 RoleManager 是否有管理员权限（用于授权多签钱包）
  const roleManagerAdminRole = await roleManager.DEFAULT_ADMIN_ROLE();
  const hasRoleManagerAdminRole = await roleManager.hasRole(roleManagerAdminRole, deployer.address);
  
  if (hasRoleManagerAdminRole) {
    // 在 RoleManager 中授权 deployer.address 为多签钱包
    const deployerIsAuthorizedInRoleManager = await roleManager.isAuthorizedMultisig(deployer.address);
    if (!deployerIsAuthorizedInRoleManager) {
      console.log("在 RoleManager 中授权部署账户为多签钱包...");
      const tx = await roleManager.setMultisigAuthorization(deployer.address, true);
      await tx.wait();
      console.log("✅ 部署账户已在 RoleManager 中授权为多签钱包");
    } else {
      console.log("✅ 部署账户已在 RoleManager 中授权为多签钱包");
    }
  } else {
    console.log("⚠️  无法在 RoleManager 中授权：需要 RoleManager 管理员权限");
  }
  
  // 在主合约中授予关键角色给 deployer.address
  console.log("\n在主合约中授予角色给部署账户...");
  const criticalRoles = [
    { name: "MINTER_ROLE", role: MINTER_ROLE },
    { name: "REVENUE_MANAGER_ROLE", role: REVENUE_MANAGER_ROLE },
    { name: "PATENT_MANAGER_ROLE", role: PATENT_MANAGER_ROLE },
    { name: "RESERVE_MANAGER_ROLE", role: RESERVE_MANAGER_ROLE },
  ];
  
  for (const { name, role } of criticalRoles) {
    const hasRole = await patentCoin.hasRole(role, deployer.address);
    if (!hasRole) {
      console.log(`授予 ${name} 给部署账户...`);
      const tx = await patentCoin.grantRole(role, deployer.address);
      await tx.wait();
      console.log(`✅ ${name} 已授予给部署账户`);
    } else {
      console.log(`✅ 部署账户已有 ${name}`);
    }
  }
  
  // 在模块中授予角色和授权多签钱包
  console.log("\n在模块中授予角色和授权多签钱包给部署账户...");
  
  // PatentAssetManager
  const patentModuleAdminRole = await patentAssetManager.DEFAULT_ADMIN_ROLE();
  const hasPatentModuleAdminRole = await patentAssetManager.hasRole(patentModuleAdminRole, deployer.address);
  if (hasPatentModuleAdminRole) {
    const hasPatentManagerRoleInModule = await patentAssetManager.hasRole(PATENT_MANAGER_ROLE, deployer.address);
    if (!hasPatentManagerRoleInModule) {
      console.log("在 PatentAssetManager 中授予 PATENT_MANAGER_ROLE 给部署账户...");
      const tx = await patentAssetManager.grantRole(PATENT_MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log("✅ 角色已授予");
    }
    const isAuthorizedInPatentModule = await patentAssetManager.isAuthorizedMultisig(deployer.address);
    if (!isAuthorizedInPatentModule) {
      console.log("在 PatentAssetManager 中授权部署账户为多签钱包...");
      const tx = await patentAssetManager.setMultisigAuthorization(deployer.address, true);
      await tx.wait();
      console.log("✅ 授权多签已设置");
    }
  }
  
  // RevenueDistributor (重用已有的变量)
  if (hasRevenueModuleAdminRole) {
    const hasRevenueManagerRoleInModuleForDeployer = await revenueDistributor.hasRole(REVENUE_MANAGER_ROLE, deployer.address);
    if (!hasRevenueManagerRoleInModuleForDeployer) {
      console.log("在 RevenueDistributor 中授予 REVENUE_MANAGER_ROLE 给部署账户...");
      const tx = await revenueDistributor.grantRole(REVENUE_MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log("✅ 角色已授予");
    }
    const isAuthorizedInRevenueModuleForDeployer = await revenueDistributor.isAuthorizedMultisig(deployer.address);
    if (!isAuthorizedInRevenueModuleForDeployer) {
      console.log("在 RevenueDistributor 中授权部署账户为多签钱包...");
      const tx = await revenueDistributor.setMultisigAuthorization(deployer.address, true);
      await tx.wait();
      console.log("✅ 授权多签已设置");
    }
  }
  
  // ReserveAssetManager (重用已有的变量)
  if (hasReserveModuleAdminRole) {
    const hasReserveManagerRoleInModuleForDeployer = await reserveAssetManager.hasRole(RESERVE_MANAGER_ROLE, deployer.address);
    if (!hasReserveManagerRoleInModuleForDeployer) {
      console.log("在 ReserveAssetManager 中授予 RESERVE_MANAGER_ROLE 给部署账户...");
      const tx = await reserveAssetManager.grantRole(RESERVE_MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log("✅ 角色已授予");
    }
    const isAuthorizedInReserveModuleForDeployer = await reserveAssetManager.isAuthorizedMultisig(deployer.address);
    if (!isAuthorizedInReserveModuleForDeployer) {
      console.log("在 ReserveAssetManager 中授权部署账户为多签钱包...");
      const tx = await reserveAssetManager.setMultisigAuthorization(deployer.address, true);
      await tx.wait();
      console.log("✅ 授权多签已设置");
    }
  }

  console.log("\n=== 验证 ===");
  const deployerHasMinterRole = await patentCoin.hasRole(MINTER_ROLE, deployer.address);
  const deployerHasPatentManagerRole = await patentAssetManager.hasRole(PATENT_MANAGER_ROLE, deployer.address);
  const deployerHasRevenueManagerRole = await patentCoin.hasRole(REVENUE_MANAGER_ROLE, deployer.address);
  
  const deployerIsAuthorizedInRoleManager = await roleManager.isAuthorizedMultisig(deployer.address);
  const deployerIsAuthorizedInPatentModule = await patentAssetManager.isAuthorizedMultisig(deployer.address);
  const deployerIsAuthorizedInRevenueModule = await revenueDistributor.isAuthorizedMultisig(deployer.address);
  
  console.log("主合约权限:");
  console.log("  MINTER_ROLE:", deployerHasMinterRole);
  console.log("  REVENUE_MANAGER_ROLE:", deployerHasRevenueManagerRole);
  
  console.log("\n模块权限:");
  console.log("  PATENT_MANAGER_ROLE in PatentAssetManager:", deployerHasPatentManagerRole);
  
  const deployerHasReserveManagerRole = await reserveAssetManager.hasRole(RESERVE_MANAGER_ROLE, deployer.address);
  const deployerIsAuthorizedInReserveModule = await reserveAssetManager.isAuthorizedMultisig(deployer.address);
  
  console.log("\n授权多签状态:");
  console.log("  RoleManager:", deployerIsAuthorizedInRoleManager);
  console.log("  PatentAssetManager:", deployerIsAuthorizedInPatentModule);
  console.log("  RevenueDistributor:", deployerIsAuthorizedInRevenueModule);
  console.log("  ReserveAssetManager:", deployerIsAuthorizedInReserveModule);
  
  if (deployerHasMinterRole && deployerIsAuthorizedInRoleManager) {
    console.log("\n✅ 部署账户现在可以铸造代币了！");
  } else {
    console.log("\n⚠️  部署账户仍无法铸造代币");
    if (!deployerHasMinterRole) console.log("  原因：没有 MINTER_ROLE");
    if (!deployerIsAuthorizedInRoleManager) console.log("  原因：不是授权多签");
  }
  
  if (deployerHasPatentManagerRole && deployerIsAuthorizedInPatentModule) {
    console.log("✅ 部署账户现在可以管理专利了！");
  } else {
    console.log("⚠️  部署账户仍无法管理专利");
    if (!deployerHasPatentManagerRole) console.log("  原因：没有 PATENT_MANAGER_ROLE");
    if (!deployerIsAuthorizedInPatentModule) console.log("  原因：在模块中不是授权多签");
  }
  
  if (deployerHasRevenueManagerRole && deployerIsAuthorizedInRevenueModule) {
    console.log("✅ 部署账户现在可以分配收益了！");
  } else {
    console.log("⚠️  部署账户仍无法分配收益");
    if (!deployerHasRevenueManagerRole) console.log("  原因：没有 REVENUE_MANAGER_ROLE");
    if (!deployerIsAuthorizedInRevenueModule) console.log("  原因：在模块中不是授权多签");
  }
  
  if (deployerHasReserveManagerRole && deployerIsAuthorizedInReserveModule) {
    console.log("✅ 部署账户现在可以管理储备资产了！");
  } else {
    console.log("⚠️  部署账户仍无法管理储备资产");
    if (!deployerHasReserveManagerRole) console.log("  原因：没有 RESERVE_MANAGER_ROLE");
    if (!deployerIsAuthorizedInReserveModule) console.log("  原因：在模块中不是授权多签");
  }
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

