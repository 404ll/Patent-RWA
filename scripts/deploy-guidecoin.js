const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying GuideCoin with patent asset backing...");

  // 获取签名者
  const [
    deployer,
    admin,
    minter,
    pauser,
    resumer,
    blacklister,
    freezer,
    upgrader,
    patentManager,
    revenueManager,
    treasury
  ] = await ethers.getSigners();

  console.log("Deploying with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 部署可升级的GuideCoin合约
  const GuideCoin = await ethers.getContractFactory("GuideCoin");

  const guideCoin = await upgrades.deployProxy(
    GuideCoin,
    [
      admin.address,          // admin
      minter.address,         // minter
      pauser.address,         // pauser
      resumer.address,        // resumer
      blacklister.address,    // blacklister
      freezer.address,        // freezer
      upgrader.address,       // upgrader
      patentManager.address,  // patentManager
      revenueManager.address, // revenueManager
      treasury.address        // treasury
    ],
    {
      kind: "uups",
      initializer: "initialize"
    }
  );

  await guideCoin.deployed();

  console.log("GuideCoin proxy deployed to:", guideCoin.address);
  console.log("Implementation deployed to:", await upgrades.erc1967.getImplementationAddress(guideCoin.address));

  // 添加示例专利资产
  console.log("\n🧬 Adding sample patent assets...");

  const samplePatents = [
    {
      patentNumber: "US10123456B2",
      title: "Novel Cancer Treatment Compound",
      inventors: ["Dr. Alice Smith", "Dr. Bob Johnson"],
      valuationUSD: ethers.utils.parseEther("5000000"), // $5M
      weight: 4000, // 40%
      ipfsMetadata: "QmSampleHash1234567890abcdef"
    },
    {
      patentNumber: "US10789012B2",
      title: "Advanced Drug Delivery System",
      inventors: ["Dr. Carol Davis", "Dr. David Wilson"],
      valuationUSD: ethers.utils.parseEther("3000000"), // $3M
      weight: 3000, // 30%
      ipfsMetadata: "QmSampleHash0987654321fedcba"
    },
    {
      patentNumber: "US10456789B2",
      title: "Biomarker Detection Method",
      inventors: ["Dr. Eve Brown", "Dr. Frank Miller"],
      valuationUSD: ethers.utils.parseEther("2000000"), // $2M
      weight: 2000, // 20%
      ipfsMetadata: "QmSampleHashabcdef1234567890"
    }
  ];

  let totalValuation = ethers.BigNumber.from(0);

  for (const patent of samplePatents) {
    const tx = await guideCoin.connect(patentManager).addPatent(
      patent.patentNumber,
      patent.title,
      patent.inventors,
      patent.valuationUSD,
      patent.weight,
      patent.ipfsMetadata
    );
    await tx.wait();

    totalValuation = totalValuation.add(patent.valuationUSD);
    console.log(`✓ Added patent: ${patent.patentNumber} (${patent.title})`);
  }

  // 验证专利资产
  const patentCount = await guideCoin.getPatentCount();

  console.log(`\nPatent Asset Summary:`);
  console.log(`- Total patents: ${patentCount}`);
  console.log(`- Total valuation: $${ethers.utils.formatEther(totalValuation)} USD`);

  // 铸造初始GUIDE代币 (基于专利估值的一定比例)
  console.log("\nMinting initial GUIDE tokens...");

  const minterContract = guideCoin.connect(minter);
  const initialSupply = ethers.utils.parseEther("1000000"); // 100万GUIDE代币

  await minterContract.mint(treasury.address, initialSupply);
  console.log(`✓ Minted ${ethers.utils.formatEther(initialSupply)} GUIDE tokens to treasury`);

  // 检查资产支撑比率
  const backingRatio = await guideCoin.getBackingRatio();
  console.log(`✓ Asset backing ratio: $${ethers.utils.formatEther(backingRatio)} USD per GUIDE`);

  // 验证角色分配
  console.log("\n📋 Verifying role assignments...");
  const roles = [
    { name: "DEFAULT_ADMIN_ROLE", hash: "0x0000000000000000000000000000000000000000000000000000000000000000" },
    { name: "MINTER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE")) },
    { name: "BURNER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE")) },
    { name: "PAUSER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE")) },
    { name: "RESUME_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RESUME_ROLE")) },
    { name: "BLACKLISTER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BLACKLISTER_ROLE")) },
    { name: "FREEZER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FREEZER_ROLE")) },
    { name: "UPGRADER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UPGRADER_ROLE")) },
    { name: "PATENT_MANAGER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PATENT_MANAGER_ROLE")) },
    { name: "REVENUE_MANAGER_ROLE", hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("REVENUE_MANAGER_ROLE")) }
  ];

  for (const role of roles) {
    const memberCount = await guideCoin.getRoleMemberCount(role.hash);
    console.log(`- ${role.name}: ${memberCount} member(s)`);
  }

  // 保存部署信息
  const deploymentInfo = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      guideCoin: {
        proxy: guideCoin.address,
        implementation: await upgrades.erc1967.getImplementationAddress(guideCoin.address),
        admin: await upgrades.erc1967.getAdminAddress(guideCoin.address)
      }
    },
    roles: {
      admin: admin.address,
      minter: minter.address,
      pauser: pauser.address,
      resumer: resumer.address,
      blacklister: blacklister.address,
      freezer: freezer.address,
      upgrader: upgrader.address,
      patentManager: patentManager.address,
      revenueManager: revenueManager.address,
      treasury: treasury.address
    },
    patentAssets: {
      count: patentCount.toString(),
      totalValuation: ethers.utils.formatEther(totalValuation),
      patents: samplePatents.map(p => ({
        patentNumber: p.patentNumber,
        title: p.title,
        valuation: ethers.utils.formatEther(p.valuationUSD),
        weight: p.weight
      }))
    },
    tokenomics: {
      initialSupply: ethers.utils.formatEther(initialSupply),
      backingRatio: ethers.utils.formatEther(backingRatio),
      platformFeeRate: "2.5%"
    }
  };

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(`📋 GuideCoin Address: ${guideCoin.address}`);
  console.log(`💰 Total Patent Valuation: $${ethers.utils.formatEther(totalValuation)} USD`);
  console.log(`🪙 Initial GUIDE Supply: ${ethers.utils.formatEther(initialSupply)} GUIDE`);
  console.log(`📊 Backing Ratio: $${ethers.utils.formatEther(backingRatio)} USD per GUIDE`);
  console.log("=".repeat(60));

  // 将部署信息写入文件
  const fs = require('fs');
  fs.writeFileSync(
    `deployment-${network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
