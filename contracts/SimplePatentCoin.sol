// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimplePatentCoin
 * @dev 简化版的 PatentCoin，用于演示和测试
 */
contract SimplePatentCoin is ERC20, Ownable {
    uint256 public maxSupply;

    // 专利资产相关
    struct PatentAsset {
        string patentNumber;
        string title;
        string[] inventors;
        uint256 valuationUSD;
        uint256 weight;
        bool active;
        uint256 addedTimestamp;
        string ipfsMetadata;
    }

    mapping(string => PatentAsset) public patentAssets;
    string[] public patentNumbers;

    // 收益分配相关
    mapping(address => uint256) public claimableRevenue;
    uint256 public totalDistributedRevenue;
    uint256 public currentRound;

    // 事件
    event PatentAssetAdded(string indexed patentNumber, uint256 valuationUSD);
    event RevenueDistributed(uint256 round, uint256 totalAmount);
    event RevenueClaimed(address indexed user, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply
    ) ERC20(name, symbol) Ownable() {
        maxSupply = _maxSupply;
    }

    /**
     * @dev 铸造代币
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        _mint(to, amount);
    }

    /**
     * @dev 添加专利资产
     */
    function addPatentAsset(
        string memory patentNumber,
        string memory title,
        string[] memory inventors,
        uint256 valuationUSD,
        uint256 weight,
        string memory ipfsMetadata
    ) public onlyOwner {
        require(
            bytes(patentAssets[patentNumber].patentNumber).length == 0,
            "Patent already exists"
        );

        patentAssets[patentNumber] = PatentAsset({
            patentNumber: patentNumber,
            title: title,
            inventors: inventors,
            valuationUSD: valuationUSD,
            weight: weight,
            active: true,
            addedTimestamp: block.timestamp,
            ipfsMetadata: ipfsMetadata
        });

        patentNumbers.push(patentNumber);

        emit PatentAssetAdded(patentNumber, valuationUSD);
    }

    /**
     * @dev 获取专利数量
     */
    function getPatentCount() public view returns (uint256) {
        return patentNumbers.length;
    }

    /**
     * @dev 获取专利编号列表
     */
    function getPatentNumbers() public view returns (string[] memory) {
        return patentNumbers;
    }

    /**
     * @dev 获取专利信息
     */
    function getPatentInfo(
        string memory patentNumber
    )
        public
        view
        returns (
            string memory title,
            string memory description,
            string[] memory inventors,
            uint256 valuationUSD,
            string memory ipfsMetadata,
            bool active
        )
    {
        PatentAsset memory patent = patentAssets[patentNumber];
        return (
            patent.title,
            patent.title, // 使用 title 作为 description
            patent.inventors,
            patent.valuationUSD,
            patent.ipfsMetadata,
            patent.active
        );
    }

    /**
     * @dev 分配收益
     */
    function distributeRevenue(uint256 totalAmount) public onlyOwner {
        require(totalAmount > 0, "Amount must be greater than 0");
        require(totalSupply() > 0, "No tokens in circulation");

        currentRound++;
        totalDistributedRevenue += totalAmount;

        // 简化的收益分配：按持币比例分配
        // 在实际实现中，这里应该更复杂的逻辑

        emit RevenueDistributed(currentRound, totalAmount);
    }

    /**
     * @dev 设置用户可领取收益
     */
    function setClaimableRevenue(
        address user,
        uint256 amount
    ) public onlyOwner {
        claimableRevenue[user] = amount;
    }

    /**
     * @dev 获取用户可领取收益
     */
    function getClaimableRevenue(address user) public view returns (uint256) {
        return claimableRevenue[user];
    }

    /**
     * @dev 领取收益
     */
    function claimRevenue() public {
        uint256 amount = claimableRevenue[msg.sender];
        require(amount > 0, "No revenue to claim");

        claimableRevenue[msg.sender] = 0;

        // 在实际实现中，这里应该转移 USDC 或其他稳定币
        // 现在只是发出事件
        emit RevenueClaimed(msg.sender, amount);
    }

    /**
     * @dev 获取总收益
     */
    function getTotalRevenue() public view returns (uint256) {
        return totalDistributedRevenue;
    }

    /**
     * @dev 获取总专利估值
     */
    function totalPatentValuation() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < patentNumbers.length; i++) {
            if (patentAssets[patentNumbers[i]].active) {
                total += patentAssets[patentNumbers[i]].valuationUSD;
            }
        }
        return total;
    }

    /**
     * @dev 获取支撑比率
     */
    function getBackingRatio() public view returns (uint256) {
        uint256 totalValuation = totalPatentValuation();
        uint256 supply = totalSupply();

        if (supply == 0) return 0;

        // 返回百分比 (乘以100)
        return (totalValuation * 100) / supply;
    }
}
