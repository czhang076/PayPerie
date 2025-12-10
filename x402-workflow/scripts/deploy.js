import { ethers } from "hardhat";

async function main() {
  const treasuryWallet = process.env.TREASURY_WALLET;
  const usdcToken = process.env.USDC_TOKEN;

  if (!treasuryWallet) {
    throw new Error("TREASURY_WALLET is not set");
  }

  if (!usdcToken) {
    throw new Error("USDC_TOKEN is not set");
  }

  const vault = await ethers.deployContract("PayPerieVault", [usdcToken, treasuryWallet]);
  await vault.waitForDeployment();

  console.log(`PayPerieVault deployed to ${await vault.getAddress()}`);
  console.log(`Treasury: ${treasuryWallet}`);
  console.log(`USDC: ${usdcToken}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
