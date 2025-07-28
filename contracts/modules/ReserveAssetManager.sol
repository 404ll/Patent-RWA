// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BaseGuideCoinModule.sol";
import "../interfaces/IGuideCoinModules.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title ReserveAssetManager
 * @dev 管理GuideCoin的储备资产，包括资产管理、价值计算和支撑比率
 */
contract ReserveAssetManager is BaseGuideCoinModule, IReserveAssetManager {
    // ============ 状态变量 ============
    mapping(address => ReserveAsset) public reserveAssets;
    address[] public reserveAssetsList;
    uint256 public totalReserveValueUSD;

    // 资产类型分类
    enum AssetType { STABLECOIN, CRYPTOCURRENCY, COMMODITY, FIAT, OTHER }
    mapping(address => AssetType) public assetTypes;
    mapping(AssetType => uint256) public typeValuation;

    // 风险管理
    uint256 public maxAssetWeight = 5000; // 50% 最大单一资产权重
    uint256 public minReserveRatio = 10000; // 100% 最小储备比率
    
    // 价格更新控制
    mapping(address => uint256) public lastPriceUpdate;
    uint256 public priceUpdateInterval = 1 hours;

    // ============ 事件 ============
    event AssetTypeSet(address indexed asset, AssetType assetType);
    event ReserveRatioUpdated(uint256 newRatio);
    event AssetWeightExceeded(address indexed asset, uint256 weight, uint256 maxWeight);

    // ============ 初始化函数 ============
    function initialize(address _guideCoinContract, address admin) public initializer {
        __BaseGuideCoinModule_init(_guideCoinContract, admin);
    }

    // ============ 储备资产管理 ============
    /**
     * @dev 更新储备资产
     */
    function updateReserveAsset(
        address tokenAddress,
        uint256 amount,
        uint256 valueUSD
    ) external override onlyRoleMultisig(RESERVE_MANAGER_ROLE) {
        _requireNonZeroAddress(tokenAddress, "ReserveAssetManager: invalid token address");
        _requirePositiveValue(valueUSD, "ReserveAssetManager: invalid value");

        ReserveAsset storage asset = reserveAssets[tokenAddress];
        bool isNewAsset = !asset.isActive;
        uint256 oldValue = asset.valueUSD;

        asset.tokenAddress = tokenAddress;
        asset.amount = amount;
        asset.valueUSD = valueUSD;
        asset.isActive = true;
        asset.lastUpdated = block.timestamp;
        lastPriceUpdate[tokenAddress] = block.timestamp;

        if (isNewAsset) {
            reserveAssetsList.push(tokenAddress);
            emit ReserveAssetAdded(tokenAddress, amount, valueUSD);
        } else {
            emit ReserveAssetUpdated(tokenAddress, amount, valueUSD);
        }

        // 更新类型估值
        AssetType assetType = assetTypes[tokenAddress];
        typeValuation[assetType] = typeValuation[assetType] - oldValue + valueUSD;

        _updateTotalReserveValue();
        _checkAssetWeight(tokenAddress, valueUSD);
    }

    /**
     * @dev 移除储备资产
     */
    function removeReserveAsset(address tokenAddress) external onlyRoleMultisig(RESERVE_MANAGER_ROLE) {
        require(reserveAssets[tokenAddress].isActive, "ReserveAssetManager: asset not found");

        ReserveAsset storage asset = reserveAssets[tokenAddress];
        uint256 oldValue = asset.valueUSD;
        
        // 更新类型估值
        AssetType assetType = assetTypes[tokenAddress];
        typeValuation[assetType] -= oldValue;

        asset.isActive = false;
        asset.valueUSD = 0;

        // 从数组中移除
        for (uint256 i = 0; i < reserveAssetsList.length; i++) {
            if (reserveAssetsList[i] == tokenAddress) {
                reserveAssetsList[i] = reserveAssetsList[reserveAssetsList.length - 1];
                reserveAssetsList.pop();
                break;
            }
        }

        _updateTotalReserveValue();
    }

    /**
     * @dev 批量更新储备资产
     */
    function batchUpdateReserveAssets(
        address[] calldata tokenAddresses,
        uint256[] calldata amounts,
        uint256[] calldata valuesUSD
    ) external onlyRoleMultisig(RESERVE_MANAGER_ROLE) {
        _requireArrayLengthMatch(tokenAddresses.length, amounts.length, "ReserveAssetManager: arrays length mismatch");
        _requireArrayLengthMatch(tokenAddresses.length, valuesUSD.length, "ReserveAssetManager: arrays length mismatch");

        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            this.updateReserveAsset(tokenAddresses[i], amounts[i], valuesUSD[i]);
        }
    }

    // ============ 资产类型管理 ============
    /**
     * @dev 设置资产类型
     */
    function setAssetType(address tokenAddress, AssetType assetType) external onlyRoleMultisig(RESERVE_MANAGER_ROLE) {
        _requireNonZeroAddress(tokenAddress, "ReserveAssetManager: invalid token address");
        
        // 更新旧类型的估值
        AssetType oldType = assetTypes[tokenAddress];
        uint256 assetValue = reserveAssets[tokenAddress].valueUSD;
        
        if (assetValue > 0) {
            typeValuation[oldType] -= assetValue;
            typeValuation[assetType] += assetValue;
        }

        assetTypes[tokenAddress] = assetType;
        emit AssetTypeSet(tokenAddress, assetType);
    }

    // ============ 风险管理 ============
    /**
     * @dev 设置最大资产权重
     */
    function setMaxAssetWeight(uint256 _maxAssetWeight) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_maxAssetWeight <= 10000, "ReserveAssetManager: weight cannot exceed 100%");
        maxAssetWeight = _maxAssetWeight;
    }

    /**
     * @dev 设置最小储备比率
     */
    function setMinReserveRatio(uint256 _minReserveRatio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReserveRatio = _minReserveRatio;
    }

    /**
     * @dev 设置价格更新间隔
     */
    function setPriceUpdateInterval(uint256 _interval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceUpdateInterval = _interval;
    }

    // ============ 查询函数 ============
    /**
     * @dev 获取储备资产信息
     */
    function getReserveAsset(address tokenAddress) external view override returns (ReserveAsset memory) {
        return reserveAssets[tokenAddress];
    }

    /**
     * @dev 获取储备资产数量
     */
    function getReserveAssetCount() external view override returns (uint256) {
        return reserveAssetsList.length;
    }

    /**
     * @dev 获取总储备价值
     */
    function getTotalReserveValueUSD() external view override returns (uint256) {
        return totalReserveValueUSD;
    }

    /**
     * @dev 获取支撑比率
     */
    function getBackingRatio(uint256 totalSupply) external view override returns (uint256) {
        if (totalSupply == 0) return 0;
        return (totalReserveValueUSD * 1e18) / totalSupply;
    }

    /**
     * @dev 获取资产权重
     */
    function getAssetWeight(address tokenAddress) external view returns (uint256) {
        if (totalReserveValueUSD == 0) return 0;
        return (reserveAssets[tokenAddress].valueUSD * 10000) / totalReserveValueUSD;
    }

    /**
     * @dev 获取资产类型估值
     */
    function getTypeValuation(AssetType assetType) external view returns (uint256) {
        return typeValuation[assetType];
    }

    /**
     * @dev 获取储备资产列表（分页）
     */
    function getReserveAssetsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory paginatedAssets) {
        require(offset < reserveAssetsList.length, "ReserveAssetManager: offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > reserveAssetsList.length) {
            end = reserveAssetsList.length;
        }
        
        paginatedAssets = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            paginatedAssets[i - offset] = reserveAssetsList[i];
        }
    }

    /**
     * @dev 检查储备健康状况
     */
    function checkReserveHealth(uint256 totalSupply) external view returns (
        bool isHealthy,
        uint256 currentRatio,
        uint256 requiredRatio,
        address[] memory overweightAssets
    ) {
        currentRatio = this.getBackingRatio(totalSupply);
        requiredRatio = minReserveRatio;
        isHealthy = currentRatio >= requiredRatio;

        // 检查超重资产
        uint256 overweightCount = 0;
        for (uint256 i = 0; i < reserveAssetsList.length; i++) {
            if (this.getAssetWeight(reserveAssetsList[i]) > maxAssetWeight) {
                overweightCount++;
            }
        }

        overweightAssets = new address[](overweightCount);
        uint256 index = 0;
        for (uint256 i = 0; i < reserveAssetsList.length; i++) {
            if (this.getAssetWeight(reserveAssetsList[i]) > maxAssetWeight) {
                overweightAssets[index] = reserveAssetsList[i];
                index++;
            }
        }

        if (overweightCount > 0) {
            isHealthy = false;
        }
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-ReserveAssetManager";
    }

    // ============ 内部函数 ============
    /**
     * @dev 更新总储备价值
     */
    function _updateTotalReserveValue() internal {
        uint256 total = 0;
        for (uint256 i = 0; i < reserveAssetsList.length; i++) {
            ReserveAsset storage asset = reserveAssets[reserveAssetsList[i]];
            if (asset.isActive) {
                total += asset.valueUSD;
            }
        }
        
        uint256 oldValue = totalReserveValueUSD;
        totalReserveValueUSD = total;
        
        emit ReserveUpdated(oldValue, total, total > 0 ? (total * 1e18) / total : 0);
    }

    /**
     * @dev 检查资产权重
     */
    function _checkAssetWeight(address tokenAddress, uint256 valueUSD) internal {
        if (totalReserveValueUSD > 0) {
            uint256 weight = (valueUSD * 10000) / totalReserveValueUSD;
            if (weight > maxAssetWeight) {
                emit AssetWeightExceeded(tokenAddress, weight, maxAssetWeight);
            }
        }
    }
}
