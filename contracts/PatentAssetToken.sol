// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IEIP5269.sol";

/**
 * @title PatentAssetToken
 * @dev 专利资产代币合约，每个专利发行独立的ERC20代币
 * 集成收益分配、元数据管理等所有功能
 */
contract PatentAssetToken is
    ERC20,
    ERC20Permit,
    ERC20Snapshot,
    Ownable,
    Pausable,
    ReentrancyGuard,
    IEIP5269
{
    struct PatentInfo {
        string patentNumber; // 专利号
        string title; // 专利标题
        uint256 valuationUSD; // 美元估值
        uint256 tokenizedAmount; // 代币化数量
        bool active; // 是否激活
        address revenueToken; // 收益分配代币地址(USDC/USDT等)
    }

    struct DistributionRound {
        uint256 totalAmount; // 总分配金额
        uint256 snapshotId; // 快照ID
        uint256 timestamp; // 分配时间
        mapping(address => bool) claimed; // 是否已领取
    }

    PatentInfo public patentInfo;
    address public metadataRegistry;

    // 收益分配相关
    mapping(uint256 => DistributionRound) public distributionRounds;
    uint256 public totalRevenueDistributed;
    uint256 public currentDistributionRound;

    event RevenueDistributed(
        uint256 indexed round,
        uint256 totalAmount,
        uint256 snapshotId
    );
    event RevenueClaimed(address indexed user, uint256 amount, uint256 round);
    event PatentInfoUpdated(string title, uint256 valuationUSD);
    event MetadataRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    address public platformFeeRecipient;
    uint256 public platformFeeRate = 250; // 2.5% in basis points
    uint256 public constant MAX_FEE_RATE = 1000; // 10%

    event PlatformFeeUpdated(uint256 oldRate, uint256 newRate);
    event FeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );

    constructor(
        string memory name,
        string memory symbol,
        string memory _patentNumber,
        string memory _title,
        uint256 _valuationUSD,
        uint256 _tokenizedAmount,
        address _metadataRegistry,
        address _revenueToken
    ) ERC20(name, symbol) ERC20Permit(name) {
        patentInfo = PatentInfo({
            patentNumber: _patentNumber,
            title: _title,
            valuationUSD: _valuationUSD,
            tokenizedAmount: _tokenizedAmount,
            active: true,
            revenueToken: _revenueToken
        });

        metadataRegistry = _metadataRegistry;
        _mint(msg.sender, _tokenizedAmount);
    }

    /**
     * @dev 分配专利收益（可选扣除简单的平台费用）
     */
    function distributeRevenue(
        uint256 totalRevenue
    ) external onlyOwner nonReentrant {
        require(totalRevenue > 0, "Revenue must be > 0");
        require(patentInfo.active, "Patent not active");

        uint256 platformFee = 0;
        uint256 netRevenue = totalRevenue;

        // 如果设置了平台费用接收者，则扣除费用
        if (platformFeeRecipient != address(0) && platformFeeRate > 0) {
            platformFee = (totalRevenue * platformFeeRate) / 10000;
            netRevenue = totalRevenue - platformFee;
        }

        // 创建快照
        uint256 snapshotId = _snapshot();
        currentDistributionRound++;
        totalRevenueDistributed += netRevenue;

        // 记录分配轮次
        DistributionRound storage round = distributionRounds[
            currentDistributionRound
        ];
        round.totalAmount = netRevenue;
        round.snapshotId = snapshotId;
        round.timestamp = block.timestamp;

        // 转入收益代币
        IERC20(patentInfo.revenueToken).transferFrom(
            msg.sender,
            address(this),
            totalRevenue
        );

        // 转移平台费用（如果有）
        if (platformFee > 0) {
            IERC20(patentInfo.revenueToken).transfer(
                platformFeeRecipient,
                platformFee
            );
        }

        emit RevenueDistributed(
            currentDistributionRound,
            netRevenue,
            snapshotId
        );
    }

    /**
     * @dev 领取收益
     */
    function claimRevenue(uint256 roundId) external nonReentrant {
        require(
            roundId <= currentDistributionRound && roundId > 0,
            "Invalid round"
        );

        DistributionRound storage round = distributionRounds[roundId];
        require(!round.claimed[msg.sender], "Already claimed");

        uint256 userBalance = balanceOfAt(msg.sender, round.snapshotId);
        require(userBalance > 0, "No tokens at snapshot");

        uint256 totalSupplyAtSnapshot = totalSupplyAt(round.snapshotId);
        uint256 userShare = (round.totalAmount * userBalance) /
            totalSupplyAtSnapshot;

        round.claimed[msg.sender] = true;
        IERC20(patentInfo.revenueToken).transfer(msg.sender, userShare);

        emit RevenueClaimed(msg.sender, userShare, roundId);
    }

    /**
     * @dev 查询可领取收益
     */
    function getClaimableRevenue(
        address user,
        uint256 roundId
    ) external view returns (uint256) {
        if (roundId > currentDistributionRound || roundId == 0) return 0;

        DistributionRound storage round = distributionRounds[roundId];
        if (round.claimed[user]) return 0;

        uint256 userBalance = balanceOfAt(user, round.snapshotId);
        if (userBalance == 0) return 0;

        uint256 totalSupplyAtSnapshot = totalSupplyAt(round.snapshotId);
        return (round.totalAmount * userBalance) / totalSupplyAtSnapshot;
    }

    /**
     * @dev 更新专利信息
     */
    function updatePatentInfo(
        string memory _title,
        uint256 _valuationUSD
    ) external onlyOwner {
        patentInfo.title = _title;
        patentInfo.valuationUSD = _valuationUSD;
        emit PatentInfoUpdated(_title, _valuationUSD);
    }

    /**
     * @dev 停用专利
     */
    function deactivatePatent() external onlyOwner {
        patentInfo.active = false;
    }

    // EIP-5269 元数据接口实现
    function tokenURI(
        uint256 tokenId
    ) external view override returns (string memory) {
        require(tokenId == 0, "Invalid token ID for ERC20");

        if (metadataRegistry == address(0)) {
            return "";
        }

        return
            ITokenMetadataRegistry(metadataRegistry).getMetadataURI(
                address(this)
            );
    }

    function updateMetadata(string calldata ipfsHash) external onlyOwner {
        require(metadataRegistry != address(0), "Metadata registry not set");
        ITokenMetadataRegistry(metadataRegistry).updateMetadata(
            address(this),
            ipfsHash
        );
        emit MetadataUpdate(0);
    }

    function setMetadataRegistry(address _metadataRegistry) external onlyOwner {
        address oldRegistry = metadataRegistry;
        metadataRegistry = _metadataRegistry;
        emit MetadataRegistryUpdated(oldRegistry, _metadataRegistry);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Override required functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev 设置平台费用率
     */
    function setPlatformFeeRate(uint256 newRate) external onlyOwner {
        require(newRate <= MAX_FEE_RATE, "Fee rate too high");
        uint256 oldRate = platformFeeRate;
        platformFeeRate = newRate;
        emit PlatformFeeUpdated(oldRate, newRate);
    }

    /**
     * @dev 设置平台费用接收者
     */
    function setPlatformFeeRecipient(address recipient) external onlyOwner {
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = recipient;
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }
}
