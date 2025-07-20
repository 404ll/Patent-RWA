// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RevenueDistribution is Ownable, ReentrancyGuard {
    struct RevenuePool {
        uint256 totalRevenue;
        uint256 distributedRevenue;
        mapping(address => uint256) claimedAmounts;
        mapping(address => uint256) shareholdings;
        address[] shareholders;
        bool active;
    }

    mapping(bytes32 => RevenuePool) public revenuePools;
    mapping(address => bool) public authorizedTokens;

    event RevenuePoolCreated(bytes32 indexed poolId, uint256 totalRevenue);
    event RevenueDistributed(
        bytes32 indexed poolId,
        address indexed shareholder,
        uint256 amount
    );
    event ShareholderAdded(
        bytes32 indexed poolId,
        address indexed shareholder,
        uint256 shares
    );
    event TokenAuthorized(address indexed token);

    modifier onlyAuthorizedToken(address token) {
        require(authorizedTokens[token], "Token not authorized");
        _;
    }

    constructor() {}

    function authorizeToken(address token) external onlyOwner {
        authorizedTokens[token] = true;
        emit TokenAuthorized(token);
    }

    function createRevenuePool(
        bytes32 poolId,
        address token,
        uint256 totalRevenue,
        address[] calldata shareholders,
        uint256[] calldata shares
    ) external onlyOwner onlyAuthorizedToken(token) {
        require(shareholders.length == shares.length, "Arrays length mismatch");
        require(!revenuePools[poolId].active, "Pool already exists");

        RevenuePool storage pool = revenuePools[poolId];
        pool.totalRevenue = totalRevenue;
        pool.active = true;

        uint256 totalShares = 0;
        for (uint256 i = 0; i < shareholders.length; i++) {
            require(shareholders[i] != address(0), "Invalid shareholder");
            require(shares[i] > 0, "Invalid share amount");

            pool.shareholdings[shareholders[i]] = shares[i];
            pool.shareholders.push(shareholders[i]);
            totalShares += shares[i];
        }

        require(totalShares > 0, "No shares allocated");
        require(
            IERC20(token).transferFrom(msg.sender, address(this), totalRevenue),
            "Transfer failed"
        );

        emit RevenuePoolCreated(poolId, totalRevenue);

        for (uint256 i = 0; i < shareholders.length; i++) {
            emit ShareholderAdded(poolId, shareholders[i], shares[i]);
        }
    }

    function claimRevenue(
        bytes32 poolId,
        address token
    ) external nonReentrant onlyAuthorizedToken(token) {
        RevenuePool storage pool = revenuePools[poolId];
        require(pool.active, "Pool not active");
        require(pool.shareholdings[msg.sender] > 0, "Not a shareholder");

        uint256 claimableAmount = _calculateClaimableAmount(poolId, msg.sender);
        require(claimableAmount > 0, "No revenue to claim");

        pool.claimedAmounts[msg.sender] += claimableAmount;
        pool.distributedRevenue += claimableAmount;

        require(
            IERC20(token).transfer(msg.sender, claimableAmount),
            "Transfer failed"
        );

        emit RevenueDistributed(poolId, msg.sender, claimableAmount);
    }

    function getClaimableAmount(
        bytes32 poolId,
        address shareholder
    ) external view returns (uint256) {
        return _calculateClaimableAmount(poolId, shareholder);
    }

    function _calculateClaimableAmount(
        bytes32 poolId,
        address shareholder
    ) internal view returns (uint256) {
        RevenuePool storage pool = revenuePools[poolId];

        if (!pool.active || pool.shareholdings[shareholder] == 0) {
            return 0;
        }

        uint256 totalShares = _getTotalShares(poolId);
        uint256 sharePercentage = (pool.shareholdings[shareholder] * 1e18) /
            totalShares;
        uint256 totalEntitlement = (pool.totalRevenue * sharePercentage) / 1e18;

        return totalEntitlement - pool.claimedAmounts[shareholder];
    }

    function _getTotalShares(bytes32 poolId) internal view returns (uint256) {
        RevenuePool storage pool = revenuePools[poolId];
        uint256 totalShares = 0;

        for (uint256 i = 0; i < pool.shareholders.length; i++) {
            totalShares += pool.shareholdings[pool.shareholders[i]];
        }

        return totalShares;
    }

    function getPoolInfo(
        bytes32 poolId
    )
        external
        view
        returns (
            uint256 totalRevenue,
            uint256 distributedRevenue,
            uint256 shareholderCount,
            bool active
        )
    {
        RevenuePool storage pool = revenuePools[poolId];
        return (
            pool.totalRevenue,
            pool.distributedRevenue,
            pool.shareholders.length,
            pool.active
        );
    }
}
