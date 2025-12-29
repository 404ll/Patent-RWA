const { ethers } = require("hardhat");

/**
 * 铸造初始代币脚本
 * 用于在部署后铸造一些初始代币用于测试
 */
async function main() {
  console.log("Minting initial tokens...");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("Minting with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // PatentCoinModular 主合约地址（从环境变量或部署输出获取）
  const PATENT_COIN_ADDRESS = process.env.PATENT_COIN_ADDRESS || "0xA29057f94EAEda93020664032D4a5A2da2DDa488";
  
  console.log("PatentCoinModular address:", PATENT_COIN_ADDRESS);

  // 获取合约实例
  const patentCoin = await ethers.getContractAt("PatentCoinModular", PATENT_COIN_ADDRESS);

  // 检查当前总供应量
  const currentSupply = await patentCoin.totalSupply();
  console.log("Current total supply:", ethers.formatEther(currentSupply), "PATENT");

  // 检查是否有 MINTER_ROLE
  const MINTER_ROLE = await patentCoin.MINTER_ROLE();
  const hasMinterRole = await patentCoin.hasRole(MINTER_ROLE, deployer.address);
  console.log("Deployer has MINTER_ROLE:", hasMinterRole);

  // 检查是否为授权的多签钱包
  const roleManager = await patentCoin.roleManager();
  const roleManagerContract = await ethers.getContractAt("RoleManager", roleManager);
  const isAuthorized = await roleManagerContract.isAuthorizedMultisig(deployer.address);
  console.log("Deployer is authorized multisig:", isAuthorized);

  if (!hasMinterRole || !isAuthorized) {
    console.error("❌ 错误：部署账户没有 MINTER_ROLE 或不是授权的多签钱包");
    console.log("请确保部署脚本中 deployer.address 被设置为 minter 多签地址");
    process.exit(1);
  }

  // 要铸造的代币数量（从环境变量获取，默认 1000 万）
  const requestedAmount = process.env.MINT_AMOUNT 
    ? ethers.parseEther(process.env.MINT_AMOUNT)
    : ethers.parseEther("10000000"); // 默认 10M tokens
  const recipient = deployer.address; // 铸造给部署者

  console.log("\n=== 检查铸造限制 ===");
  
  // 检查每日铸造限额
  const dailyMintLimit = await patentCoin.dailyMintLimit();
  console.log("每日铸造限额:", ethers.formatEther(dailyMintLimit), "PATENT");
  
  // 检查今天已铸造的数量（使用与合约相同的方式计算 today）
  // 合约中使用: block.timestamp / 1 days (86400 秒)
  const blockNumber = await deployer.provider.getBlockNumber();
  const block = await deployer.provider.getBlock(blockNumber);
  const today = Math.floor(Number(block.timestamp) / 86400); // 86400 秒 = 1 天
  const dailyMintAmount = await patentCoin.dailyMintAmount(today);
  console.log("今日已铸造:", ethers.formatEther(dailyMintAmount), "PATENT");
  
  // 计算可用的铸造额度
  const availableMint = dailyMintLimit > dailyMintAmount 
    ? dailyMintLimit - dailyMintAmount 
    : 0n;
  console.log("今日可用额度:", ethers.formatEther(availableMint), "PATENT");
  
  // 检查最大供应量
  const maxSupply = await patentCoin.maxSupply();
  const maxAvailableFromSupply = maxSupply - currentSupply;
  console.log("最大供应量剩余:", ethers.formatEther(maxAvailableFromSupply), "PATENT");
  
  // 确定实际可铸造的数量
  let mintAmount = requestedAmount;
  if (mintAmount > availableMint) {
    console.log("\n⚠️  警告：请求数量超过今日可用额度");
    console.log("请求数量:", ethers.formatEther(mintAmount), "PATENT");
    console.log("可用额度:", ethers.formatEther(availableMint), "PATENT");
    
    if (availableMint > 0n) {
      console.log("将使用可用额度进行铸造:", ethers.formatEther(availableMint), "PATENT");
      mintAmount = availableMint;
    } else {
      console.error("❌ 错误：今日铸造额度已用完，请明天再试");
      process.exit(1);
    }
  }
  
  if (mintAmount > maxAvailableFromSupply) {
    console.log("\n⚠️  警告：请求数量超过最大供应量剩余");
    console.log("请求数量:", ethers.formatEther(mintAmount), "PATENT");
    console.log("最大供应量剩余:", ethers.formatEther(maxAvailableFromSupply), "PATENT");
    console.log("将使用最大供应量剩余进行铸造:", ethers.formatEther(maxAvailableFromSupply), "PATENT");
    mintAmount = maxAvailableFromSupply;
  }
  
  if (mintAmount === 0n) {
    console.error("❌ 错误：无法铸造，可用额度为 0");
    process.exit(1);
  }

  console.log("\n=== 准备铸造代币 ===");
  console.log("实际铸造数量:", ethers.formatEther(mintAmount), "PATENT");
  console.log("Recipient:", recipient);

  try {
    // 铸造代币
    console.log("\n铸造代币...");
    const tx = await patentCoin.mint(recipient, mintAmount);
    console.log("Transaction hash:", tx.hash);
    
    console.log("等待交易确认...");
    const receipt = await tx.wait();
    console.log("✅ 交易已确认，区块号:", receipt.blockNumber);

    // 验证结果
    const newSupply = await patentCoin.totalSupply();
    const recipientBalance = await patentCoin.balanceOf(recipient);
    
    console.log("\n=== 铸造结果 ===");
    console.log("New total supply:", ethers.formatEther(newSupply), "PATENT");
    console.log("Recipient balance:", ethers.formatEther(recipientBalance), "PATENT");
    console.log("✅ 代币铸造成功！");
    
  } catch (error) {
    console.error("❌ 铸造失败:", error.message);
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
    if (error.data) {
      console.error("错误数据:", error.data);
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

