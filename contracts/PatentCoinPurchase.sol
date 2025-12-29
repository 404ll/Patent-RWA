// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PatentCoinModular.sol";

/**
 * @title PatentCoinPurchase
 * @dev 购买合约，允许用户使用 ETH 购买 PATENT 代币
 */
contract PatentCoinPurchase is Ownable, ReentrancyGuard {
    PatentCoinModular public patentCoin;
    address public treasury; // 接收 ETH 的地址
    
    // 价格相关
    uint256 public ethPriceUSD; // ETH 价格（USD，8位小数，例如 2500 * 1e8）
    address public priceOracle; // Chainlink 价格预言机地址（可选）
    
    // 购买事件
    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 patentAmount,
        uint256 ethPriceUSD
    );
    event EthPriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address newTreasury);

    constructor(
        address _patentCoin,
        address _treasury,
        uint256 _initialEthPriceUSD
    ) {
        require(_patentCoin != address(0), "Invalid patent coin address");
        require(_treasury != address(0), "Invalid treasury address");
        
        patentCoin = PatentCoinModular(_patentCoin);
        treasury = _treasury;
        ethPriceUSD = _initialEthPriceUSD; // 例如 2500 * 1e8
    }

    /**
     * @dev 使用 ETH 购买 PATENT 代币
     * @param patentAmount 要购买的 PATENT 数量（18位小数）
     */
    function buyWithETH(uint256 patentAmount) external payable nonReentrant {
        require(patentAmount > 0, "Invalid patent amount");
        require(msg.value > 0, "Must send ETH");
        
        // 计算需要的 ETH 数量
        // patentPriceUSD 是 1 PATENT 的 USD 价格（18位小数）
        // ethPriceUSD 是 1 ETH 的 USD 价格（8位小数）
        // 需要的 ETH = (patentAmount * patentPriceUSD) / (ethPriceUSD * 1e10)
        
        // 简化计算：假设 1 PATENT = 1 USD
        // 需要的 ETH = patentAmount / (ethPriceUSD * 1e10)
        uint256 requiredETH = (patentAmount * 1e8) / ethPriceUSD;
        
        require(msg.value >= requiredETH, "Insufficient ETH sent");
        
        // 转移 ETH 到资金库
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer failed");
        
        // 铸造 PATENT 代币给购买者
        // 注意：这个合约需要有 MINTER_ROLE 权限
        patentCoin.mint(msg.sender, patentAmount);
        
        // 如果有找零，退回给用户
        if (msg.value > requiredETH) {
            uint256 refund = msg.value - requiredETH;
            (bool refundSuccess, ) = msg.sender.call{value: refund}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit TokensPurchased(msg.sender, msg.value, patentAmount, ethPriceUSD);
    }

    /**
     * @dev 更新 ETH 价格（仅管理员）
     */
    function updateEthPrice(uint256 _newPriceUSD) external onlyOwner {
        require(_newPriceUSD > 0, "Invalid price");
        ethPriceUSD = _newPriceUSD;
        emit EthPriceUpdated(_newPriceUSD);
    }

    /**
     * @dev 更新资金库地址（仅管理员）
     */
    function updateTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    /**
     * @dev 从 Chainlink 预言机更新 ETH 价格（可选）
     */
    function updatePriceFromOracle() external {
        // TODO: 实现 Chainlink 价格预言机集成
        // 这里需要导入 Chainlink 的 AggregatorV3Interface
    }

    /**
     * @dev 计算购买指定数量的 PATENT 需要多少 ETH
     */
    function calculateETHRequired(uint256 patentAmount) external view returns (uint256) {
        if (patentAmount == 0 || ethPriceUSD == 0) return 0;
        // 假设 1 PATENT = 1 USD
        return (patentAmount * 1e8) / ethPriceUSD;
    }

    /**
     * @dev 计算使用指定 ETH 能购买多少 PATENT
     */
    function calculatePatentAmount(uint256 ethAmount) external view returns (uint256) {
        if (ethAmount == 0 || ethPriceUSD == 0) return 0;
        // 假设 1 PATENT = 1 USD
        return (ethAmount * ethPriceUSD) / 1e8;
    }

    // 接收 ETH（用于直接转账购买，不推荐）
    receive() external payable {
        revert("Please use buyWithETH function");
    }
}



