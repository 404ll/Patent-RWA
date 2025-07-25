const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy TokenMetadataRegistry
    const TokenMetadataRegistry = await ethers.getContractFactory("TokenMetadataRegistry");
    const metadataRegistry = await TokenMetadataRegistry.deploy();
    await metadataRegistry.deployed();
    console.log("TokenMetadataRegistry deployed to:", metadataRegistry.address);

    // 2. Deploy PatentAssetTokenFactory
    const PatentAssetTokenFactory = await ethers.getContractFactory("PatentAssetTokenFactory");
    const tokenFactory = await PatentAssetTokenFactory.deploy(metadataRegistry.address);
    await tokenFactory.deployed();
    console.log("PatentAssetTokenFactory deployed to:", tokenFactory.address);

    // 3. Create sample patent tokens
    const patents = [
        {
            name: "BioPharma Patent #001",
            symbol: "BPP001",
            patentNumber: "US10123456B2",
            title: "Novel Cancer Treatment Method",
            valuation: 5000000,
            tokenSupply: ethers.utils.parseEther("1000000")
        },
        {
            name: "BioPharma Patent #002",
            symbol: "BPP002",
            patentNumber: "US10789012B2",
            title: "Advanced Drug Delivery System",
            valuation: 3000000,
            tokenSupply: ethers.utils.parseEther("500000")
        }
    ];

    const deployedPatentTokens = [];
    const usdcAddress = "0xA0b86a33E6441b8dB4B2b8b8b8b8b8b8b8b8b8b8"; // USDC placeholder

    for (const patent of patents) {
        const tx = await tokenFactory.createPatentToken(
            patent.name,
            patent.symbol,
            patent.patentNumber,
            patent.title,
            patent.valuation,
            patent.tokenSupply,
            usdcAddress
        );

        const receipt = await tx.wait();
        const tokenAddress = receipt.events.find(e => e.event === 'PatentTokenCreated').args.tokenAddress;
        deployedPatentTokens.push({
            ...patent,
            address: tokenAddress
        });

        console.log(`${patent.name} deployed to:`, tokenAddress);

        // Register metadata for each patent token
        const metadataHash = `QmPatent${patent.symbol}Metadata`;
        await metadataRegistry.registerMetadata(tokenAddress, metadataHash);
        console.log(`Metadata registered for ${patent.symbol}:`, metadataHash);
    }

    // 4. Deploy PatentVesting (updated to work with any ERC20)
    const PatentVesting = await ethers.getContractFactory("PatentVesting");
    const patentVesting = await PatentVesting.deploy();
    await patentVesting.deployed();
    console.log("PatentVesting deployed to:", patentVesting.address);

    console.log("\n=== Deployment Summary ===");
    console.log("TokenMetadataRegistry:", metadataRegistry.address);
    console.log("PatentAssetTokenFactory:", tokenFactory.address);
    console.log("PatentVesting:", patentVesting.address);
    console.log("\nDeployed Patent Tokens:");
    deployedPatentTokens.forEach(token => {
        console.log(`- ${token.name} (${token.symbol}): ${token.address}`);
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
