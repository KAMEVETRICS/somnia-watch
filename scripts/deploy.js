// scripts/deploy.js
// Deploys WhaleTracker to Somnia Testnet
//
// Usage:
//   npx hardhat run scripts/deploy.js --network somniaTestnet

const hre = require("hardhat");

async function main() {
  console.log("🐋 Deploying WhaleTracker to Somnia Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "STT\n");

  // Deploy — no constructor args needed (addresses are hardcoded constants)
  const WhaleTracker = await hre.ethers.getContractFactory("WhaleTracker");
  const whaleTracker = await WhaleTracker.deploy();
  await whaleTracker.waitForDeployment();

  const address = await whaleTracker.getAddress();
  console.log("✅ WhaleTracker deployed to:", address);
  console.log("\n📋 Next steps:");
  console.log("   1. Copy the address above into your .env as WHALE_TRACKER_ADDRESS");
  console.log("   2. Run: node scripts/subscribe.mjs");
  console.log("   3. Verify on https://shannon.somnia.network/address/" + address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
