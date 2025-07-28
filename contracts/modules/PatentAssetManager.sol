// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BaseGuideCoinModule.sol";
import "../interfaces/IGuideCoinModules.sol";

/**
 * @title PatentAssetManager
 * @dev 管理GuideCoin的专利资产，包括添加、更新和估值管理
 */
contract PatentAssetManager is BaseGuideCoinModule, IPatentAssetManager {
    // ============ 状态变量 ============
    mapping(string => PatentAsset) public patents;
    string[] public patentNumbers;
    uint256 public totalPatentValuation;

    // 专利分类管理
    mapping(string => string) public patentCategories; // patentNumber => category
    mapping(string => uint256) public categoryValuation; // category => total valuation
    string[] public categories;

    // 专利历史记录
    struct PatentValuationHistory {
        uint256 oldValuation;
        uint256 newValuation;
        uint256 timestamp;
        address updater;
    }
    mapping(string => PatentValuationHistory[]) public patentValuationHistory;

    // ============ 事件 ============
    event PatentCategoryAdded(string indexed category);
    event PatentCategorized(string indexed patentNumber, string indexed category);

    // ============ 初始化函数 ============
    function initialize(address _guideCoinContract, address admin) public initializer {
        __BaseGuideCoinModule_init(_guideCoinContract, admin);
    }

    // ============ 专利管理函数 ============
    /**
     * @dev 添加专利资产
     */
    function addPatent(
        string memory patentNumber,
        string memory title,
        string[] memory inventors,
        uint256 valuationUSD,
        uint256 weight,
        string memory ipfsMetadata
    ) external override onlyRoleMultisig(PATENT_MANAGER_ROLE) {
        _requireNonEmptyString(patentNumber, "PatentAssetManager: invalid patent number");
        require(!patents[patentNumber].active, "PatentAssetManager: patent already exists");
        _requirePositiveValue(valuationUSD, "PatentAssetManager: invalid valuation");

        patents[patentNumber] = PatentAsset({
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
        totalPatentValuation += valuationUSD;

        // 记录初始估值历史
        patentValuationHistory[patentNumber].push(PatentValuationHistory({
            oldValuation: 0,
            newValuation: valuationUSD,
            timestamp: block.timestamp,
            updater: msg.sender
        }));

        emit PatentAdded(patentNumber, valuationUSD, weight);
    }

    /**
     * @dev 更新专利估值
     */
    function updatePatentValuation(
        string memory patentNumber,
        uint256 newValuationUSD,
        uint256 newWeight
    ) external override onlyRoleMultisig(PATENT_MANAGER_ROLE) {
        require(patents[patentNumber].active, "PatentAssetManager: patent not found");
        _requirePositiveValue(newValuationUSD, "PatentAssetManager: invalid valuation");

        PatentAsset storage patent = patents[patentNumber];
        uint256 oldValuation = patent.valuationUSD;
        
        // 更新总估值
        totalPatentValuation = totalPatentValuation - oldValuation + newValuationUSD;
        
        // 更新分类估值（如果有分类）
        string memory category = patentCategories[patentNumber];
        if (bytes(category).length > 0) {
            categoryValuation[category] = categoryValuation[category] - oldValuation + newValuationUSD;
        }

        patent.valuationUSD = newValuationUSD;
        patent.weight = newWeight;

        // 记录估值历史
        patentValuationHistory[patentNumber].push(PatentValuationHistory({
            oldValuation: oldValuation,
            newValuation: newValuationUSD,
            timestamp: block.timestamp,
            updater: msg.sender
        }));

        emit PatentUpdated(patentNumber, newValuationUSD, newWeight);
    }

    /**
     * @dev 移除专利资产
     */
    function removePatent(string memory patentNumber) external onlyRoleMultisig(PATENT_MANAGER_ROLE) {
        require(patents[patentNumber].active, "PatentAssetManager: patent not found");

        PatentAsset storage patent = patents[patentNumber];
        totalPatentValuation -= patent.valuationUSD;
        
        // 更新分类估值
        string memory category = patentCategories[patentNumber];
        if (bytes(category).length > 0) {
            categoryValuation[category] -= patent.valuationUSD;
        }

        patent.active = false;

        // 从数组中移除
        for (uint256 i = 0; i < patentNumbers.length; i++) {
            if (keccak256(bytes(patentNumbers[i])) == keccak256(bytes(patentNumber))) {
                patentNumbers[i] = patentNumbers[patentNumbers.length - 1];
                patentNumbers.pop();
                break;
            }
        }

        emit PatentRemoved(patentNumber);
    }

    // ============ 专利分类管理 ============
    /**
     * @dev 添加专利分类
     */
    function addPatentCategory(string memory category) external onlyRoleMultisig(PATENT_MANAGER_ROLE) {
        _requireNonEmptyString(category, "PatentAssetManager: invalid category");
        
        // 检查分类是否已存在
        for (uint256 i = 0; i < categories.length; i++) {
            require(
                keccak256(bytes(categories[i])) != keccak256(bytes(category)),
                "PatentAssetManager: category already exists"
            );
        }

        categories.push(category);
        emit PatentCategoryAdded(category);
    }

    /**
     * @dev 为专利分配分类
     */
    function categorizePatent(
        string memory patentNumber,
        string memory category
    ) external onlyRoleMultisig(PATENT_MANAGER_ROLE) {
        require(patents[patentNumber].active, "PatentAssetManager: patent not found");
        _requireNonEmptyString(category, "PatentAssetManager: invalid category");

        // 检查分类是否存在
        bool categoryExists = false;
        for (uint256 i = 0; i < categories.length; i++) {
            if (keccak256(bytes(categories[i])) == keccak256(bytes(category))) {
                categoryExists = true;
                break;
            }
        }
        require(categoryExists, "PatentAssetManager: category does not exist");

        // 更新旧分类的估值
        string memory oldCategory = patentCategories[patentNumber];
        if (bytes(oldCategory).length > 0) {
            categoryValuation[oldCategory] -= patents[patentNumber].valuationUSD;
        }

        // 设置新分类
        patentCategories[patentNumber] = category;
        categoryValuation[category] += patents[patentNumber].valuationUSD;

        emit PatentCategorized(patentNumber, category);
    }

    // ============ 查询函数 ============
    /**
     * @dev 获取专利信息
     */
    function getPatent(string memory patentNumber) external view override returns (PatentAsset memory) {
        return patents[patentNumber];
    }

    /**
     * @dev 获取专利数量
     */
    function getPatentCount() external view override returns (uint256) {
        return patentNumbers.length;
    }

    /**
     * @dev 获取总专利估值
     */
    function getTotalPatentValuation() external view override returns (uint256) {
        return totalPatentValuation;
    }

    /**
     * @dev 获取专利分类
     */
    function getPatentCategory(string memory patentNumber) external view returns (string memory) {
        return patentCategories[patentNumber];
    }

    /**
     * @dev 获取分类估值
     */
    function getCategoryValuation(string memory category) external view returns (uint256) {
        return categoryValuation[category];
    }

    /**
     * @dev 获取所有分类
     */
    function getCategories() external view returns (string[] memory) {
        return categories;
    }

    /**
     * @dev 获取专利估值历史
     */
    function getPatentValuationHistory(
        string memory patentNumber
    ) external view returns (PatentValuationHistory[] memory) {
        return patentValuationHistory[patentNumber];
    }

    /**
     * @dev 获取专利列表（分页）
     */
    function getPatentsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (string[] memory paginatedPatents) {
        require(offset < patentNumbers.length, "PatentAssetManager: offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > patentNumbers.length) {
            end = patentNumbers.length;
        }
        
        paginatedPatents = new string[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            paginatedPatents[i - offset] = patentNumbers[i];
        }
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-PatentAssetManager";
    }
}
