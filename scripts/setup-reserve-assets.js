const { ethers } = require("hardhat");

/**
 * 设置储备资产脚本
 * 用于设置储备资产以计算支持比率
 */
async function main() {
  console.log("设置储备资产...");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // PatentCoinModular 主合约地址
  const PATENT_COIN_ADDRESS = process.env.PATENT_COIN_ADDRESS || "0xA29057f94EAEda93020664032D4a5A2da2DDa488";
  
  console.log("PatentCoinModular address:", PATENT_COIN_ADDRESS);

  // 获取合约实例
  const patentCoin = await ethers.getContractAt("PatentCoinModular", PATENT_COIN_ADDRESS);
  
  // 获取 ReserveAssetManager 地址
  const reserveAssetManagerAddress = await patentCoin.reserveAssetManager();
  console.log("ReserveAssetManager address:", reserveAssetManagerAddress);
  
  const reserveAssetManager = await ethers.getContractAt("ReserveAssetManager", reserveAssetManagerAddress);

  // 检查权限
  const RESERVE_MANAGER_ROLE = await reserveAssetManager.RESERVE_MANAGER_ROLE();
  const hasReserveManagerRole = await reserveAssetManager.hasRole(RESERVE_MANAGER_ROLE, deployer.address);
  const isAuthorized = await reserveAssetManager.isAuthorizedMultisig(deployer.address);
  
  console.log("\n=== 权限检查 ===");
  console.log("Has RESERVE_MANAGER_ROLE:", hasReserveManagerRole);
  console.log("Is authorized multisig:", isAuthorized);
  
  if (!hasReserveManagerRole || !isAuthorized) {
    console.error("❌ 错误：部署账户没有 RESERVE_MANAGER_ROLE 或不是授权的多签钱包");
    console.log("请运行 fix-roles.js 脚本修复权限");
    process.exit(1);
  }

  // 获取当前总供应量
  const totalSupply = await patentCoin.totalSupply();
  console.log("当前总供应量:", ethers.formatEther(totalSupply), "PATENT");

  // 获取当前总储备价值
  const currentTotalReserve = await reserveAssetManager.getTotalReserveValueUSD();
  console.log("当前总储备价值:", currentTotalReserve.toString(), "USD");

  // 获取当前支持比率
  const currentBackingRatio = await patentCoin.getBackingRatio();
  console.log("当前支持比率:", currentBackingRatio.toString());

  try {
    // 为了演示，我们使用一个测试代币地址作为储备资产
    // 在实际使用中，应该使用真实的稳定币地址（如 USDC、USDT 等）
    // 注意：储备资产和收益分配可以使用同一个代币
    const USE_EXISTING_TOKEN = "0x4102613B42721d40233d360Fc7dFAC05a09678Ea";
    
    let reserveTokenAddress;
    
    if (USE_EXISTING_TOKEN) {
      reserveTokenAddress = USE_EXISTING_TOKEN;
      console.log("使用已存在的储备代币:", reserveTokenAddress);
    } else {
      // 部署一个测试 ERC20 代币作为储备资产
      console.log("部署测试 ERC20 代币作为储备资产...");
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20.deploy(
        "Reserve Asset Token",
        "RAT",
        deployer.address,
        ethers.parseEther("1000000") // 100万代币
      );
      await mockToken.waitForDeployment();
      reserveTokenAddress = await mockToken.getAddress();
      console.log("✅ 测试代币部署成功:", reserveTokenAddress);
    }

    // 设置储备资产
    // 支持比率 = (totalReserveValueUSD * 1e18) / totalSupply
    // 如果要设置 100% 支持比率（即 1 USD per PATENT），需要：
    //   totalReserveValueUSD * 1e18 = totalSupply
    //   即 totalReserveValueUSD = totalSupply / 1e18（以美元为单位，无小数）
    // 
    // 例如：如果总供应量是 10M PATENT (10,000,000 * 1e18)
    //   要设置 1 USD per PATENT，需要 totalReserveValueUSD = 10,000,000（无小数）
    //   合约计算：backingRatio = (10,000,000 * 1e18) / (10,000,000 * 1e18) = 1e18 = 1.0 USD per PATENT
    
    // 计算储备资产价值（以美元为单位，无小数）
    // 假设 1 PATENT = 1 USD，那么 reserveValueUSD 应该等于 totalSupply 的 token 数量
    const totalSupplyInTokens = totalSupply / BigInt(1e18); // 转换为代币数量（去掉18位小数）
    const reserveValueUSD = totalSupply > 0n 
      ? totalSupplyInTokens // 直接使用代币数量作为 USD 价值（无小数）
      : BigInt(10000000); // 默认 10M USD（无小数）
    
    const reserveAmount = ethers.parseEther("1000000"); // 100万代币数量
    
    console.log("\n=== 设置储备资产 ===");
    console.log("代币地址:", reserveTokenAddress);
    console.log("代币数量:", ethers.formatEther(reserveAmount));
    console.log("价值 (USD):", reserveValueUSD.toString());
    
    const tx = await reserveAssetManager.updateReserveAsset(
      reserveTokenAddress,
      reserveAmount,
      reserveValueUSD
    );
    console.log("Transaction hash:", tx.hash);
    
    console.log("等待交易确认...");
    await tx.wait();
    console.log("✅ 储备资产设置成功");

    // 验证结果
    const newTotalReserve = await reserveAssetManager.getTotalReserveValueUSD();
    const newBackingRatio = await patentCoin.getBackingRatio();
    
    console.log("\n=== 验证结果 ===");
    console.log("新的总储备价值:", newTotalReserve.toString(), "USD");
    console.log("新的支持比率:", newBackingRatio.toString());
    console.log("支持比率 (百分比):", Number(newBackingRatio) / 1e16, "%");
    
    if (newBackingRatio > 0n) {
      console.log("✅ 支持比率已更新！");
    } else {
      console.log("⚠️  支持比率仍为 0，请检查储备资产设置");
    }
    
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

