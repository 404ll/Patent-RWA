const { ethers } = require("hardhat");

/**
 * 设置每日铸造/销毁限额脚本
 * 需要 DEFAULT_ADMIN_ROLE 权限
 */
async function main() {
  console.log("设置每日限额...");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);

  // PatentCoinModular 主合约地址
  const PATENT_COIN_ADDRESS = process.env.PATENT_COIN_ADDRESS || "0xA29057f94EAEda93020664032D4a5A2da2DDa488";
  
  console.log("PatentCoinModular address:", PATENT_COIN_ADDRESS);

  // 获取合约实例
  const patentCoin = await ethers.getContractAt("PatentCoinModular", PATENT_COIN_ADDRESS);

  // 检查是否有管理员权限
  const DEFAULT_ADMIN_ROLE = await patentCoin.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await patentCoin.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (!hasAdminRole) {
    console.error("❌ 错误：部署账户没有 DEFAULT_ADMIN_ROLE");
    console.log("只有管理员才能设置每日限额");
    process.exit(1);
  }

  // 从环境变量获取限额，或使用默认值
  const mintLimit = process.env.MINT_LIMIT 
    ? ethers.parseEther(process.env.MINT_LIMIT)
    : ethers.parseEther("100000000"); // 默认 100M tokens
  
  const burnLimit = process.env.BURN_LIMIT 
    ? ethers.parseEther(process.env.BURN_LIMIT)
    : ethers.parseEther("100000000"); // 默认 100M tokens

  console.log("\n=== 当前限额 ===");
  const currentMintLimit = await patentCoin.dailyMintLimit();
  const currentBurnLimit = await patentCoin.dailyBurnLimit();
  console.log("当前每日铸造限额:", ethers.formatEther(currentMintLimit), "PATENT");
  console.log("当前每日销毁限额:", ethers.formatEther(currentBurnLimit), "PATENT");

  console.log("\n=== 新限额 ===");
  console.log("新每日铸造限额:", ethers.formatEther(mintLimit), "PATENT");
  console.log("新每日销毁限额:", ethers.formatEther(burnLimit), "PATENT");

  try {
    console.log("\n设置每日限额...");
    const tx = await patentCoin.setDailyLimits(mintLimit, burnLimit);
    console.log("Transaction hash:", tx.hash);
    
    console.log("等待交易确认...");
    const receipt = await tx.wait();
    console.log("✅ 交易已确认，区块号:", receipt.blockNumber);

    // 验证结果
    const newMintLimit = await patentCoin.dailyMintLimit();
    const newBurnLimit = await patentCoin.dailyBurnLimit();
    
    console.log("\n=== 验证结果 ===");
    console.log("新的每日铸造限额:", ethers.formatEther(newMintLimit), "PATENT");
    console.log("新的每日销毁限额:", ethers.formatEther(newBurnLimit), "PATENT");
    console.log("✅ 每日限额设置成功！");
    
  } catch (error) {
    console.error("❌ 设置失败:", error.message);
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
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

