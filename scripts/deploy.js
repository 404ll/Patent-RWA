const { ethers } = require("hardhat");

async function main() {
  // Deploy PatentToken
  const PatentToken = await ethers.getContractFactory("PatentToken");
  const patentToken = await PatentToken.deploy();
  await patentToken.deployed();
  console.log("PatentToken deployed to:", patentToken.address);

  // Deploy PatentVesting
  const PatentVesting = await ethers.getContractFactory("PatentVesting");
  const vesting = await PatentVesting.deploy(patentToken.address);
  await vesting.deployed();
  console.log("PatentVesting deployed to:", vesting.address);

  // Deploy RevenueDistribution
  const RevenueDistribution = await ethers.getContractFactory("RevenueDistribution");
  const revenueDistribution = await RevenueDistribution.deploy(
    patentToken.address,
    "0xA0b86a33E6441b8dB4B2b8b8b8b8b8b8b8b8b8b8" // USDC address
  );
  await revenueDistribution.deployed();
  console.log("RevenueDistribution deployed to:", revenueDistribution.address);

  // Deploy PatentDAO
  const PatentDAO = await ethers.getContractFactory("PatentDAO");
  const dao = await PatentDAO.deploy(patentToken.address);
  await dao.deployed();
  console.log("PatentDAO deployed to:", dao.address);

  // Deploy PatentOracle
  const PatentOracle = await ethers.getContractFactory("PatentOracle");
  const oracle = await PatentOracle.deploy();
  await oracle.deployed();
  console.log("PatentOracle deployed to:", oracle.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});