const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up demo data...");

  // PatentCoinModular 主合约地址（从环境变量或部署输出获取）
  const PATENT_COIN_ADDRESS = process.env.PATENT_COIN_ADDRESS || "0xA29057f94EAEda93020664032D4a5A2da2DDa488";
  
  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("Setting up with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 获取主合约实例
  const patentCoinMain = await ethers.getContractAt("PatentCoinModular", PATENT_COIN_ADDRESS);
  console.log("PatentCoinModular address:", PATENT_COIN_ADDRESS);

  // 从主合约获取模块地址
  const patentAssetManagerAddress = await patentCoinMain.patentAssetManager();
  const revenueDistributorAddress = await patentCoinMain.revenueDistributor();
  
  console.log("PatentAssetManager address:", patentAssetManagerAddress);
  console.log("RevenueDistributor address:", revenueDistributorAddress);

  // 获取模块合约实例
  const patentAssetManager = await ethers.getContractAt("PatentAssetManager", patentAssetManagerAddress);
  const revenueDistributor = await ethers.getContractAt("RevenueDistributor", revenueDistributorAddress);
  
  // 检查权限
  const PATENT_MANAGER_ROLE = await patentAssetManager.PATENT_MANAGER_ROLE();
  const REVENUE_MANAGER_ROLE = await patentCoinMain.REVENUE_MANAGER_ROLE();
  const hasPatentManagerRole = await patentAssetManager.hasRole(PATENT_MANAGER_ROLE, deployer.address);
  const hasRevenueManagerRole = await patentCoinMain.hasRole(REVENUE_MANAGER_ROLE, deployer.address);
  
  console.log("\n=== 权限检查 ===");
  console.log("Has PATENT_MANAGER_ROLE:", hasPatentManagerRole);
  console.log("Has REVENUE_MANAGER_ROLE:", hasRevenueManagerRole);
  
  if (!hasPatentManagerRole) {
    console.error("❌ 错误：部署账户没有 PATENT_MANAGER_ROLE");
    process.exit(1);
  }
  
  if (!hasRevenueManagerRole) {
    console.error("❌ 错误：部署账户没有 REVENUE_MANAGER_ROLE");
    process.exit(1);
  }
  try {
    // console.log("\n=== 添加专利资产 ===");
    
    // // 添加专利资产 1
    // console.log("添加专利 1: US10123456B2...");
    // const tx1 = await patentAssetManager.addPatent(
    //   "US10123456B2",
    //   "mRNA疫苗递送系统",
    //   ["Dr. Sarah Chen", "Dr. Michael Johnson"],
    //   25000000, // $25M valuation (整数，不需要 parseEther)
    //   30, // 30% weight
    //   "QmYwAPJzv5CZsnA8rdHaSmKRvBohr5sFGvweJ6wGsHp7vy"
    // );
    // await tx1.wait();
    // console.log("✅ 专利 1 添加成功");
    
    // // 添加专利资产 2
    // console.log("添加专利 2: US10234567B2...");
    // const tx2 = await patentAssetManager.addPatent(
    //   "US10234567B2", 
    //   "癌症免疫治疗方法",
    //   ["Dr. Lisa Wang", "Dr. Robert Smith"],
    //   18000000, // $18M valuation
    //   25, // 25% weight
    //   "QmPChd2hVbrJ1bfo675WPtgBAeUpSBccR8ks2DxAY6CYxr"
    // );
    // await tx2.wait();
    // console.log("✅ 专利 2 添加成功");
    
    // // 添加专利资产 3
    // console.log("添加专利 3: US10345678B2...");
    // const tx3 = await patentAssetManager.addPatent(
    //   "US10345678B2",
    //   "基因编辑CRISPR技术",
    //   ["Dr. Emily Davis", "Dr. James Wilson"],
    //   32000000, // $32M valuation
    //   35, // 35% weight
    //   "QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51"
    // );
    // await tx3.wait();
    // console.log("✅ 专利 3 添加成功");
    
    // // 添加专利资产 4
    // console.log("添加专利 4: US10456789B2...");
    // const tx4 = await patentAssetManager.addPatent(
    //   "US10456789B2",
    //   "干细胞治疗技术",
    //   ["Dr. David Brown", "Dr. Jennifer Lee"],
    //   15000000, // $15M valuation
    //   10, // 10% weight
    //   "QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4"
    // );
    // await tx4.wait();
    // console.log("✅ 专利 4 添加成功");

    console.log("\n=== 设置收益数据 ===");
    
    // 为了演示，我们创建一个简单的测试 ERC20 代币用于收益分配
    // 或者使用已存在的测试代币地址（可以与储备资产使用同一个代币）
    const USE_EXISTING_TOKEN = process.env.REVENUE_TOKEN_ADDRESS || "0x4102613B42721d40233d360Fc7dFAC05a09678Ea";
    
    let revenueTokenAddress;
    
    if (USE_EXISTING_TOKEN) {
      // 使用已存在的代币地址
      revenueTokenAddress = USE_EXISTING_TOKEN;
      console.log("使用已存在的收益代币:", revenueTokenAddress);
    } else {
      // 部署一个简单的测试 ERC20 代币
      console.log("部署测试 ERC20 代币用于收益分配...");
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20.deploy(
        "Test Revenue Token",
        "TRT",
        deployer.address,
        ethers.parseEther("1000000") // 100万代币
      );
      await mockToken.waitForDeployment();
      revenueTokenAddress = await mockToken.getAddress();
      console.log("✅ 测试代币部署成功:", revenueTokenAddress);
    }
    
    // 获取代币合约实例
    const revenueToken = await ethers.getContractAt("MockERC20", revenueTokenAddress);
    
    // 获取当前总供应量
    const totalSupply = await patentCoinMain.totalSupply();
    console.log("当前总供应量:", ethers.formatEther(totalSupply), "PATENT");
    
    if (totalSupply === 0n) {
      console.log("⚠️  警告：总供应量为 0，无法分配收益（需要先铸造代币）");
      console.log("请先运行 mint-initial-tokens.js 脚本铸造一些代币");
    } else {
      // 批准代币给 RevenueDistributor
      console.log("批准代币给 RevenueDistributor...");
      const approveAmount = ethers.parseEther("1000"); // 批准 1000 个代币
      const approveTx = await revenueToken.approve(revenueDistributorAddress, approveAmount);
      await approveTx.wait();
      console.log("✅ 代币批准成功");
      
      // 分配收益
      // 注意：可以直接调用 RevenueDistributor 模块，或通过主合约调用
      // 如果通过主合约调用，主合约地址需要在 RevenueDistributor 模块中有权限
      // 这里我们直接调用 RevenueDistributor 模块
      console.log("分配收益...");
      
      // 再次检查权限（确保角色已正确授予）
      const revenueDistributorModule = await ethers.getContractAt("RevenueDistributor", revenueDistributorAddress);
      const REVENUE_MANAGER_ROLE_IN_MODULE = await revenueDistributorModule.REVENUE_MANAGER_ROLE();
      const hasRevenueManagerRoleInModule = await revenueDistributorModule.hasRole(REVENUE_MANAGER_ROLE_IN_MODULE, deployer.address);
      const isAuthorizedInRevenueModule = await revenueDistributorModule.isAuthorizedMultisig(deployer.address);
      
      console.log("收益分配权限检查:");
      console.log("  REVENUE_MANAGER_ROLE in module:", hasRevenueManagerRoleInModule);
      console.log("  Authorized multisig in module:", isAuthorizedInRevenueModule);
      
      if (!hasRevenueManagerRoleInModule || !isAuthorizedInRevenueModule) {
        console.log("⚠️  警告：收益分配权限不完整，跳过收益分配");
        console.log("请运行 fix-roles.js 脚本修复权限");
      } else {
        try {
          // 直接调用 RevenueDistributor 模块的 distributeRevenue
          // 需要传入 totalSupply 参数
          const totalSupply = await patentCoinMain.totalSupply();
          const totalRevenue = ethers.parseEther("100"); // 100 个代币作为总收益
          
          console.log("直接调用 RevenueDistributor 模块...");
          const distributeTx = await revenueDistributorModule.distributeRevenue(
            totalRevenue,
            revenueTokenAddress,
            totalSupply
          );
          await distributeTx.wait();
          console.log("✅ 收益分配成功");
        } catch (error) {
          console.error("❌ 收益分配失败:", error.message);
          if (error.message.includes("caller does not have required role")) {
            console.log("提示：请运行 fix-roles.js 脚本修复权限");
          }
        }
      }
      
      // 验证收益分配
      const currentRound = await revenueDistributor.getCurrentRevenueRound();
      console.log("当前收益轮次:", currentRound.toString());
      
      if (currentRound > 0n) {
        const revenueRound = await revenueDistributor.getRevenueRound(currentRound);
        console.log("收益轮次详情:");
        console.log("  总金额:", ethers.formatEther(revenueRound.totalAmount));
        console.log("  收益代币:", revenueRound.revenueToken);
        console.log("  时间戳:", new Date(Number(revenueRound.timestamp) * 1000).toLocaleString());
      }
    }
    
    console.log("\n=== Demo 数据设置完成 ===");
    
    // 验证数据
    console.log("\n=== 验证数据 ===");
    
    // 专利相关
    const patentCount = await patentAssetManager.getPatentCount();
    console.log("专利数量:", patentCount.toString());
    
    const totalPatentValuation = await patentAssetManager.getTotalPatentValuation();
    console.log("总专利估值:", totalPatentValuation.toString(), "USD");
    
    // 获取专利列表（使用分页）
    const patents = await patentAssetManager.getPatentsPaginated(0, 10);
    console.log("\n专利资产列表:");
    for (const patentNumber of patents) {
      const patent = await patentAssetManager.getPatent(patentNumber);
      console.log(`- ${patentNumber}: ${patent.title}`);
      console.log(`  估值: $${patent.valuationUSD.toString()}`);
      console.log(`  权重: ${patent.weight.toString()}%`);
      console.log(`  发明人: ${patent.inventors.join(", ")}`);
      console.log(`  状态: ${patent.active ? "活跃" : "停用"}`);
    }
    
    // 收益相关
    const currentRound = await revenueDistributor.getCurrentRevenueRound();
    console.log("\n当前收益轮次:", currentRound.toString());
    
    if (currentRound > 0n) {
      const revenueRound = await revenueDistributor.getRevenueRound(currentRound);
      console.log("最新收益轮次信息:");
      console.log("  总金额:", ethers.formatEther(revenueRound.totalAmount));
      console.log("  收益代币:", revenueRound.revenueToken);
      console.log("  时间戳:", new Date(Number(revenueRound.timestamp) * 1000).toLocaleString());
      console.log("  总供应量快照:", ethers.formatEther(revenueRound.totalSupplySnapshot));
    } else {
      console.log("暂无收益分配记录");
    }
    
    // 储备资产相关（从主合约获取）
    const backingRatio = await patentCoinMain.getBackingRatio();
    console.log("\n储备比率:", backingRatio.toString(), "%");
    
    const totalPatentValuationFromMain = await patentCoinMain.getTotalPatentValuation();
    console.log("主合约总专利估值:", totalPatentValuationFromMain.toString(), "USD");
    
    console.log("\n✅ Demo 数据验证完成！");
    
  } catch (error) {
    console.error("Setup failed:", error);
    throw error;
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
