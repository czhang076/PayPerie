// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PayPerieVault
 * @notice Handles revenue settlement, protocol fees, and time-locked payouts for authors.
 */
contract PayPerieVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FACILITATOR_ROLE = keccak256("FACILITATOR_ROLE");

    enum AuthorTier {
        Level0,
        Level1,
        Certified
    }

    struct AuthorProfile {
        AuthorTier tier;
        uint256 availableBalance;
        uint256 lockedBalance;
        uint256 unlockTime;
    }

    IERC20 public immutable usdcToken;
    address public treasuryWallet;
    uint256 public protocolFeeBps = 100; // 1%

    mapping(address => AuthorProfile) public authors;

    uint256 private constant BPS_DENOMINATOR = 10_000;

    event PaymentSettled(address indexed author, uint256 amount, uint256 fee, uint256 lockedAmount);
    event RevenueClaimed(address indexed author, uint256 amount);
    event AuthorTierUpdated(address indexed author, AuthorTier tier);
    event TreasuryUpdated(address indexed treasury);
    event ProtocolFeeUpdated(uint256 newFeeBps);

    constructor(IERC20 _usdcToken, address _treasuryWallet) {
        require(address(_usdcToken) != address(0), "Invalid token");
        require(_treasuryWallet != address(0), "Invalid treasury");

        usdcToken = _usdcToken;
        treasuryWallet = _treasuryWallet;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasuryWallet = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setProtocolFeeBps(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= BPS_DENOMINATOR, "Invalid fee bps");
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    function setAuthorTier(address author, uint8 tier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(author != address(0), "Invalid author");
        require(tier <= uint8(AuthorTier.Certified), "Invalid tier");
        authors[author].tier = AuthorTier(tier);
        emit AuthorTierUpdated(author, AuthorTier(tier));
    }

    function settlePayment(address author, uint256 amount) external nonReentrant onlyRole(FACILITATOR_ROLE) {
        require(author != address(0), "Invalid author");
        require(amount > 0, "Amount must be > 0");

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * protocolFeeBps) / BPS_DENOMINATOR;
        if (fee > 0) {
            usdcToken.safeTransfer(treasuryWallet, fee);
        }

        uint256 netIncome = amount - fee;

        (uint256 immediateBps, uint256 lockPeriod) = _tierConfig(authors[author].tier);
        uint256 toRelease = (netIncome * immediateBps) / BPS_DENOMINATOR;
        uint256 toLock = netIncome - toRelease;

        AuthorProfile storage profile = authors[author];
        profile.availableBalance += toRelease;
        profile.lockedBalance += toLock;

        if (toLock > 0) {
            profile.unlockTime = block.timestamp + lockPeriod;
        }

        emit PaymentSettled(author, amount, fee, toLock);
    }

    function claimRevenue() external nonReentrant {
        AuthorProfile storage profile = authors[msg.sender];

        if (profile.lockedBalance > 0 && block.timestamp >= profile.unlockTime) {
            profile.availableBalance += profile.lockedBalance;
            profile.lockedBalance = 0;
        }

        uint256 payout = profile.availableBalance;
        require(payout > 0, "Nothing to claim");

        profile.availableBalance = 0;
        usdcToken.safeTransfer(msg.sender, payout);

        emit RevenueClaimed(msg.sender, payout);
    }

    function _tierConfig(AuthorTier tier) internal pure returns (uint256 immediateBps, uint256 lockPeriod) {
        if (tier == AuthorTier.Level0) {
            return (1000, 15 days);
        }
        if (tier == AuthorTier.Level1) {
            return (5000, 7 days);
        }
        return (9000, 1 days);
    }
}
