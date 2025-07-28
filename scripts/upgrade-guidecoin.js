const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Upgrading GuideCoin...");

  const proxyAddress = process.env.PROXY_ADDRESS || ""; // Set this to your proxy address
  
  if (!proxyAddress) {
    throw new Error("Please set PROXY_ADDRESS environment variable");
  }

  // Get the upgrader signer (should have UPGRADER_ROLE)
  const [upgrader] = await ethers.getSigners();
  console.log("Upgrading with account:", upgrader.address);

  // Deploy new implementation
  const GuideCoinV2 = await ethers.getContractFactory("GuideCoin");
  
  console.log("Upgrading proxy at:", proxyAddress);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, GuideCoinV2);
  
  console.log("GuideCoin upgraded successfully");
  console.log("New implementation address:", await upgrades.erc1967.getImplementationAddress(proxyAddress));
  
  // Verify the upgrade
  const version = await upgraded.version();
  console.log("Contract version:", version);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });