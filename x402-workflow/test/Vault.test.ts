import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const ONE_DAY = 24 * 60 * 60;

describe("PayPerieVault", function () {
  async function deployFixture() {
    const [admin, facilitator, author, treasury, stranger] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    const initialMint = ethers.parseUnits("10000", 6);
    await usdc.mint(facilitator.address, initialMint);

    const Vault = await ethers.getContractFactory("PayPerieVault");
    const vault = await Vault.deploy(usdc.getAddress(), treasury.address);

    const facilitatorRole = await vault.FACILITATOR_ROLE();
    await vault.grantRole(facilitatorRole, facilitator.address);

    await usdc.connect(facilitator).approve(vault.getAddress(), initialMint);

    return { admin, facilitator, author, treasury, stranger, usdc, vault };
  }

  it("settles payment and updates balances", async function () {
    const { facilitator, author, treasury, usdc, vault } = await loadFixture(deployFixture);

    await vault.setAuthorTier(author.address, 1); // Level1

    const amount = ethers.parseUnits("1000", 6);
    const expectedFee = amount / 100n; // 1%
    const expectedNet = amount - expectedFee;
    const expectedRelease = expectedNet / 2n;
    const expectedLock = expectedNet - expectedRelease;

    const tx = await vault.connect(facilitator).settlePayment(author.address, amount);
    await expect(tx).to.emit(vault, "PaymentSettled").withArgs(author.address, amount, expectedFee, expectedLock);

    const profile = await vault.authors(author.address);
    expect(profile.availableBalance).to.equal(expectedRelease);
    expect(profile.lockedBalance).to.equal(expectedLock);
    expect(profile.unlockTime).to.be.greaterThan(0n);

    expect(await usdc.balanceOf(treasury.address)).to.equal(expectedFee);
    expect(await usdc.balanceOf(await vault.getAddress())).to.equal(expectedNet);
  });

  it("sends protocol fee to treasury", async function () {
    const { facilitator, author, treasury, usdc, vault } = await loadFixture(deployFixture);

    await vault.setAuthorTier(author.address, 2); // Certified

    const amount = ethers.parseUnits("500", 6);
    const expectedFee = amount / 100n;

    await vault.connect(facilitator).settlePayment(author.address, amount);

    expect(await usdc.balanceOf(treasury.address)).to.equal(expectedFee);
  });

  it("enforces vesting for Level0", async function () {
    const { facilitator, author, usdc, vault } = await loadFixture(deployFixture);

    const amount = ethers.parseUnits("1000", 6);
    const expectedFee = amount / 100n;
    const expectedNet = amount - expectedFee;
    const immediate = expectedNet / 10n;
    const locked = expectedNet - immediate;

    await vault.connect(facilitator).settlePayment(author.address, amount);

    const beforeClaimBalance = await usdc.balanceOf(author.address);
    await expect(vault.connect(author).claimRevenue()).to.emit(vault, "RevenueClaimed").withArgs(author.address, immediate);
    const afterFirstClaim = await usdc.balanceOf(author.address);
    expect(afterFirstClaim - beforeClaimBalance).to.equal(immediate);

    let profile = await vault.authors(author.address);
    expect(profile.availableBalance).to.equal(0n);
    expect(profile.lockedBalance).to.equal(locked);

    await time.increase(15 * ONE_DAY + 1);

    await expect(vault.connect(author).claimRevenue()).to.emit(vault, "RevenueClaimed").withArgs(author.address, locked);
    const finalBalance = await usdc.balanceOf(author.address);
    expect(finalBalance - afterFirstClaim).to.equal(locked);

    profile = await vault.authors(author.address);
    expect(profile.availableBalance).to.equal(0n);
    expect(profile.lockedBalance).to.equal(0n);
  });

  it("blocks non-facilitator from settling payments", async function () {
    const { stranger, author, vault } = await loadFixture(deployFixture);
    const amount = ethers.parseUnits("100", 6);

    await expect(vault.connect(stranger).settlePayment(author.address, amount)).to.be.revertedWith(
      `AccessControl: account ${stranger.address.toLowerCase()} is missing role ${await vault.FACILITATOR_ROLE()}`
    );
  });
});
