// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BaseGuideCoinModule.sol";
import "../interfaces/IGuideCoinModules.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title RedemptionManager
 * @dev 管理GuideCoin的赎回机制，包括赎回请求、处理流程和时间窗口控制
 */
contract RedemptionManager is BaseGuideCoinModule, IRedemptionManager {
    // ============ 状态变量 ============
    mapping(uint256 => RedemptionRequest) public redemptionRequests;
    uint256 public redemptionRequestCounter;
    
    // 赎回配置
    uint256 public constant REDEMPTION_PROCESSING_TIME = 24 hours;
    uint256 public minRedemptionAmount = 100 * 10**18; // 最小赎回金额
    uint256 public maxRedemptionAmount = 1000000 * 10**18; // 最大赎回金额
    uint256 public dailyRedemptionLimit = 10000000 * 10**18; // 日赎回限额
    
    // 赎回费用
    uint256 public redemptionFeeRate = 50; // 0.5%
    uint256 public constant MAX_REDEMPTION_FEE = 500; // 5%
    address public feeRecipient;

    // 日赎回统计
    mapping(uint256 => uint256) public dailyRedemptionAmount; // day => amount
    
    // 赎回状态枚举
    enum RedemptionStatus { PENDING, PROCESSED, CANCELLED, EXPIRED }
    mapping(uint256 => RedemptionStatus) public redemptionStatus;

    // 支持的赎回资产
    mapping(address => bool) public supportedRedemptionAssets;
    address[] public redemptionAssetsList;

    // ============ 事件 ============
    event RedemptionConfigUpdated(
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 feeRate
    );
    event RedemptionAssetAdded(address indexed asset);
    event RedemptionAssetRemoved(address indexed asset);
    event RedemptionCancelled(uint256 indexed requestId, address indexed requester);
    event RedemptionExpired(uint256 indexed requestId, address indexed requester);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // ============ 初始化函数 ============
    function initialize(
        address _guideCoinContract,
        address admin,
        address _feeRecipient
    ) public initializer {
        __BaseGuideCoinModule_init(_guideCoinContract, admin);
        _requireNonZeroAddress(_feeRecipient, "RedemptionManager: fee recipient cannot be zero address");
        feeRecipient = _feeRecipient;
    }

    // ============ 赎回请求函数 ============
    /**
     * @dev 请求赎回
     */
    function requestRedemption(
        address requester,
        uint256 amount,
        address preferredAsset
    ) external override onlyGuideCoin nonReentrant returns (uint256) {
        _requireNonZeroAddress(requester, "RedemptionManager: invalid requester");
        _requirePositiveValue(amount, "RedemptionManager: invalid amount");
        require(amount >= minRedemptionAmount, "RedemptionManager: amount below minimum");
        require(amount <= maxRedemptionAmount, "RedemptionManager: amount exceeds maximum");
        
        // 检查日赎回限额
        uint256 today = block.timestamp / 1 days;
        require(
            dailyRedemptionAmount[today] + amount <= dailyRedemptionLimit,
            "RedemptionManager: daily limit exceeded"
        );

        // 检查支持的赎回资产
        if (preferredAsset != address(0)) {
            require(
                supportedRedemptionAssets[preferredAsset],
                "RedemptionManager: unsupported redemption asset"
            );
        }

        uint256 requestId = redemptionRequestCounter++;
        redemptionRequests[requestId] = RedemptionRequest({
            requester: requester,
            amount: amount,
            timestamp: block.timestamp,
            processed: false,
            reserveAsset: preferredAsset
        });

        redemptionStatus[requestId] = RedemptionStatus.PENDING;
        dailyRedemptionAmount[today] += amount;

        emit RedemptionRequested(requestId, requester, amount);
        return requestId;
    }

    /**
     * @dev 处理赎回
     */
    function processRedemption(uint256 requestId) external override onlyRoleMultisig(REDEMPTION_PROCESSOR_ROLE) nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.requester != address(0), "RedemptionManager: invalid request");
        require(!request.processed, "RedemptionManager: already processed");
        require(redemptionStatus[requestId] == RedemptionStatus.PENDING, "RedemptionManager: invalid status");
        require(
            block.timestamp <= request.timestamp + REDEMPTION_PROCESSING_TIME,
            "RedemptionManager: processing window expired"
        );

        request.processed = true;
        redemptionStatus[requestId] = RedemptionStatus.PROCESSED;

        // 计算赎回费用
        uint256 fee = (request.amount * redemptionFeeRate) / 10000;
        uint256 netAmount = request.amount - fee;

        // 这里应该调用GuideCoin合约的销毁函数
        // 实际实现中需要与主合约交互

        emit RedemptionProcessed(requestId, request.requester, netAmount);
    }

    /**
     * @dev 取消赎回请求
     */
    function cancelRedemption(uint256 requestId) external {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.requester == msg.sender, "RedemptionManager: not requester");
        require(!request.processed, "RedemptionManager: already processed");
        require(redemptionStatus[requestId] == RedemptionStatus.PENDING, "RedemptionManager: invalid status");

        redemptionStatus[requestId] = RedemptionStatus.CANCELLED;

        // 退还日赎回限额
        uint256 requestDay = request.timestamp / 1 days;
        if (dailyRedemptionAmount[requestDay] >= request.amount) {
            dailyRedemptionAmount[requestDay] -= request.amount;
        }

        emit RedemptionCancelled(requestId, request.requester);
    }

    /**
     * @dev 标记过期的赎回请求
     */
    function markExpiredRedemption(uint256 requestId) external {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.requester != address(0), "RedemptionManager: invalid request");
        require(!request.processed, "RedemptionManager: already processed");
        require(redemptionStatus[requestId] == RedemptionStatus.PENDING, "RedemptionManager: invalid status");
        require(
            block.timestamp > request.timestamp + REDEMPTION_PROCESSING_TIME,
            "RedemptionManager: not expired yet"
        );

        redemptionStatus[requestId] = RedemptionStatus.EXPIRED;

        // 退还日赎回限额
        uint256 requestDay = request.timestamp / 1 days;
        if (dailyRedemptionAmount[requestDay] >= request.amount) {
            dailyRedemptionAmount[requestDay] -= request.amount;
        }

        emit RedemptionExpired(requestId, request.requester);
    }

    // ============ 管理函数 ============
    /**
     * @dev 更新赎回配置
     */
    function updateRedemptionConfig(
        uint256 _minAmount,
        uint256 _maxAmount,
        uint256 _dailyLimit,
        uint256 _feeRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_minAmount > 0, "RedemptionManager: invalid min amount");
        require(_maxAmount > _minAmount, "RedemptionManager: max must be greater than min");
        require(_dailyLimit >= _maxAmount, "RedemptionManager: daily limit too low");
        require(_feeRate <= MAX_REDEMPTION_FEE, "RedemptionManager: fee rate too high");

        minRedemptionAmount = _minAmount;
        maxRedemptionAmount = _maxAmount;
        dailyRedemptionLimit = _dailyLimit;
        redemptionFeeRate = _feeRate;

        emit RedemptionConfigUpdated(_minAmount, _maxAmount, _dailyLimit, _feeRate);
    }

    /**
     * @dev 添加支持的赎回资产
     */
    function addRedemptionAsset(address asset) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireNonZeroAddress(asset, "RedemptionManager: invalid asset address");
        require(!supportedRedemptionAssets[asset], "RedemptionManager: asset already supported");

        supportedRedemptionAssets[asset] = true;
        redemptionAssetsList.push(asset);

        emit RedemptionAssetAdded(asset);
    }

    /**
     * @dev 移除支持的赎回资产
     */
    function removeRedemptionAsset(address asset) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(supportedRedemptionAssets[asset], "RedemptionManager: asset not supported");

        supportedRedemptionAssets[asset] = false;

        // 从数组中移除
        for (uint256 i = 0; i < redemptionAssetsList.length; i++) {
            if (redemptionAssetsList[i] == asset) {
                redemptionAssetsList[i] = redemptionAssetsList[redemptionAssetsList.length - 1];
                redemptionAssetsList.pop();
                break;
            }
        }

        emit RedemptionAssetRemoved(asset);
    }

    /**
     * @dev 设置费用接收地址
     */
    function setFeeRecipient(address _feeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireNonZeroAddress(_feeRecipient, "RedemptionManager: invalid fee recipient");
        
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }

    // ============ 查询函数 ============
    /**
     * @dev 获取赎回请求信息
     */
    function getRedemptionRequest(uint256 requestId) external view override returns (RedemptionRequest memory) {
        return redemptionRequests[requestId];
    }

    /**
     * @dev 获取赎回请求计数器
     */
    function getRedemptionRequestCounter() external view override returns (uint256) {
        return redemptionRequestCounter;
    }

    /**
     * @dev 获取用户的赎回请求
     */
    function getUserRedemptionRequests(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory requestIds) {
        uint256 count = 0;
        
        // 首先计算用户的请求数量
        for (uint256 i = 0; i < redemptionRequestCounter; i++) {
            if (redemptionRequests[i].requester == user) {
                count++;
            }
        }

        // 应用分页
        uint256 start = offset;
        uint256 end = offset + limit;
        if (end > count) {
            end = count;
        }
        
        if (start >= count) {
            return new uint256[](0);
        }

        requestIds = new uint256[](end - start);
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < redemptionRequestCounter && resultIndex < requestIds.length; i++) {
            if (redemptionRequests[i].requester == user) {
                if (currentIndex >= start) {
                    requestIds[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }

    /**
     * @dev 获取当日剩余赎回额度
     */
    function getRemainingDailyLimit() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 used = dailyRedemptionAmount[today];
        return used >= dailyRedemptionLimit ? 0 : dailyRedemptionLimit - used;
    }

    /**
     * @dev 获取支持的赎回资产列表
     */
    function getSupportedRedemptionAssets() external view returns (address[] memory) {
        return redemptionAssetsList;
    }

    /**
     * @dev 获取赎回统计信息
     */
    function getRedemptionStats() external view returns (
        uint256 totalRequests,
        uint256 processedRequests,
        uint256 cancelledRequests,
        uint256 expiredRequests,
        uint256 pendingRequests
    ) {
        totalRequests = redemptionRequestCounter;
        
        for (uint256 i = 0; i < redemptionRequestCounter; i++) {
            RedemptionStatus status = redemptionStatus[i];
            if (status == RedemptionStatus.PROCESSED) {
                processedRequests++;
            } else if (status == RedemptionStatus.CANCELLED) {
                cancelledRequests++;
            } else if (status == RedemptionStatus.EXPIRED) {
                expiredRequests++;
            } else if (status == RedemptionStatus.PENDING) {
                pendingRequests++;
            }
        }
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-RedemptionManager";
    }
}
