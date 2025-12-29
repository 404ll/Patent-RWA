const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Simple PatentCoin System...");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  try {
    // 部署一个简单的 ERC20 代币作为 PatentCoin
    console.log("Deploying SimplePatentCoin...");
    
    const SimplePatentCoin = await ethers.getContractFactory("SimplePatentCoin");
    const patentCoin = await SimplePatentCoin.deploy(
      "PatentCoin",
      "PATENT",
      ethers.parseEther("1000000") // 1M tokens max supply
    );
    
    await patentCoin.waitForDeployment();
    const patentCoinAddress = await patentCoin.getAddress();
    
    console.log("SimplePatentCoin deployed to:", patentCoinAddress);
    
    // 铸造一些初始代币
    console.log("Minting initial tokens...");
    await patentCoin.mint(deployer.address, ethers.parseEther("10000"));
    
    console.log("Deployment completed successfully!");
    console.log("\n=== Contract Addresses ===");
    console.log("PatentCoin:", patentCoinAddress);
    
    console.log("\n=== Token Info ===");
    console.log("Name:", await patentCoin.name());
    console.log("Symbol:", await patentCoin.symbol());
    console.log("Total Supply:", ethers.formatEther(await patentCoin.totalSupply()));
    console.log("Deployer Balance:", ethers.formatEther(await patentCoin.balanceOf(deployer.address)));
    
    return {
      patentCoin: patentCoinAddress
    };
    
  } catch (error) {
    console.error("Deployment failed:", error);
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
