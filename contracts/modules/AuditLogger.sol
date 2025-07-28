// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BaseGuideCoinModule.sol";
import "../interfaces/IGuideCoinModules.sol";

/**
 * @title AuditLogger
 * @dev 管理GuideCoin的审计日志，包括操作记录、审计报告和合规追踪
 */
contract AuditLogger is BaseGuideCoinModule, IAuditLogger {
    // ============ 状态变量 ============
    OperationLog[] public operationLogs;
    mapping(bytes32 => uint256) public roleOperationCounts;
    
    // 审计相关
    address public auditorAddress;
    string public lastAuditReport;
    uint256 public lastAuditTimestamp;
    
    // 日志分类和过滤
    mapping(string => uint256) public operationTypeCounts;
    mapping(address => uint256) public operatorLogCounts;
    mapping(uint256 => uint256) public dailyLogCounts; // day => count
    
    // 日志保留策略
    uint256 public maxLogRetention = 365 days; // 最大日志保留期
    uint256 public logArchiveThreshold = 100000; // 日志归档阈值
    bool public autoArchiveEnabled = true;

    // 关键操作监控
    mapping(string => bool) public criticalOperations;
    string[] public criticalOperationsList;
    
    // 审计报告历史
    struct AuditReport {
        string reportHash;
        address auditor;
        uint256 timestamp;
        string summary;
    }
    AuditReport[] public auditReports;

    // ============ 事件 ============
    event CriticalOperationAdded(string indexed operation);
    event CriticalOperationRemoved(string indexed operation);
    event LogArchived(uint256 fromIndex, uint256 toIndex, string archiveHash);
    event AuditReportUpdated(string indexed reportHash, string summary);
    event LogRetentionUpdated(uint256 oldRetention, uint256 newRetention);

    // ============ 初始化函数 ============
    function initialize(address _guideCoinContract, address admin) public initializer {
        __BaseGuideCoinModule_init(_guideCoinContract, admin);
        lastAuditTimestamp = block.timestamp;
        
        // 初始化关键操作列表
        _addCriticalOperation("MINT");
        _addCriticalOperation("BURN");
        _addCriticalOperation("UPGRADE");
        _addCriticalOperation("ADD_BLACKLIST");
        _addCriticalOperation("FREEZE");
    }

    // ============ 日志记录函数 ============
    /**
     * @dev 记录操作日志
     */
    function logOperation(
        bytes32 role,
        address operator,
        string memory operation,
        address target,
        uint256 amount
    ) external override onlyGuideCoin {
        bytes32 txHash = keccak256(
            abi.encodePacked(block.timestamp, operator, operation, target, amount)
        );

        operationLogs.push(OperationLog({
            role: role,
            operator: operator,
            operation: operation,
            target: target,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash
        }));

        // 更新统计
        roleOperationCounts[role]++;
        operationTypeCounts[operation]++;
        operatorLogCounts[operator]++;
        
        uint256 today = block.timestamp / 1 days;
        dailyLogCounts[today]++;

        emit OperationLogged(role, operator, operation, target);

        // 检查是否需要归档
        if (autoArchiveEnabled && operationLogs.length >= logArchiveThreshold) {
            _triggerArchive();
        }
    }

    /**
     * @dev 批量记录操作日志
     */
    function batchLogOperations(
        bytes32[] calldata roles,
        address[] calldata operators,
        string[] calldata operations,
        address[] calldata targets,
        uint256[] calldata amounts
    ) external onlyGuideCoin {
        require(roles.length == operators.length, "AuditLogger: arrays length mismatch");
        require(roles.length == operations.length, "AuditLogger: arrays length mismatch");
        require(roles.length == targets.length, "AuditLogger: arrays length mismatch");
        require(roles.length == amounts.length, "AuditLogger: arrays length mismatch");

        for (uint256 i = 0; i < roles.length; i++) {
            this.logOperation(roles[i], operators[i], operations[i], targets[i], amounts[i]);
        }
    }

    // ============ 审计管理函数 ============
    /**
     * @dev 设置审计机构地址
     */
    function setAuditorAddress(address auditor) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireNonZeroAddress(auditor, "AuditLogger: auditor cannot be zero address");
        auditorAddress = auditor;
    }

    /**
     * @dev 提交审计报告
     */
    function submitAuditReport(string calldata reportHash) external override {
        require(msg.sender == auditorAddress, "AuditLogger: only auditor can submit report");
        _requireNonEmptyString(reportHash, "AuditLogger: empty report hash");

        lastAuditReport = reportHash;
        lastAuditTimestamp = block.timestamp;

        auditReports.push(AuditReport({
            reportHash: reportHash,
            auditor: msg.sender,
            timestamp: block.timestamp,
            summary: ""
        }));

        emit AuditCompleted(msg.sender, reportHash, block.timestamp);
    }

    /**
     * @dev 更新审计报告摘要
     */
    function updateAuditReportSummary(
        uint256 reportIndex,
        string calldata summary
    ) external {
        require(msg.sender == auditorAddress, "AuditLogger: only auditor can update");
        require(reportIndex < auditReports.length, "AuditLogger: invalid report index");

        auditReports[reportIndex].summary = summary;
        emit AuditReportUpdated(auditReports[reportIndex].reportHash, summary);
    }

    // ============ 关键操作管理 ============
    /**
     * @dev 添加关键操作
     */
    function addCriticalOperation(string memory operation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _addCriticalOperation(operation);
    }

    /**
     * @dev 移除关键操作
     */
    function removeCriticalOperation(string memory operation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(criticalOperations[operation], "AuditLogger: operation not critical");
        
        criticalOperations[operation] = false;
        
        // 从数组中移除
        for (uint256 i = 0; i < criticalOperationsList.length; i++) {
            if (keccak256(bytes(criticalOperationsList[i])) == keccak256(bytes(operation))) {
                criticalOperationsList[i] = criticalOperationsList[criticalOperationsList.length - 1];
                criticalOperationsList.pop();
                break;
            }
        }

        emit CriticalOperationRemoved(operation);
    }

    // ============ 日志管理函数 ============
    /**
     * @dev 设置日志保留期
     */
    function setLogRetention(uint256 _retention) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_retention >= 30 days, "AuditLogger: retention too short");
        require(_retention <= 1095 days, "AuditLogger: retention too long"); // 3 years max

        uint256 oldRetention = maxLogRetention;
        maxLogRetention = _retention;

        emit LogRetentionUpdated(oldRetention, _retention);
    }

    /**
     * @dev 设置自动归档
     */
    function setAutoArchive(bool enabled, uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoArchiveEnabled = enabled;
        if (threshold > 0) {
            logArchiveThreshold = threshold;
        }
    }

    /**
     * @dev 手动触发日志归档
     */
    function manualArchive(uint256 fromIndex, uint256 toIndex, string calldata archiveHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(fromIndex < toIndex, "AuditLogger: invalid range");
        require(toIndex <= operationLogs.length, "AuditLogger: index out of bounds");
        _requireNonEmptyString(archiveHash, "AuditLogger: empty archive hash");

        emit LogArchived(fromIndex, toIndex, archiveHash);
    }

    // ============ 查询函数 ============
    /**
     * @dev 获取操作日志数量
     */
    function getOperationLogCount() external view override returns (uint256) {
        return operationLogs.length;
    }

    /**
     * @dev 获取指定角色的操作次数
     */
    function getRoleOperationCount(bytes32 role) external view override returns (uint256) {
        return roleOperationCounts[role];
    }

    /**
     * @dev 获取操作日志
     */
    function getOperationLog(uint256 index) external view override returns (OperationLog memory) {
        require(index < operationLogs.length, "AuditLogger: index out of bounds");
        return operationLogs[index];
    }

    /**
     * @dev 获取操作日志（分页）
     */
    function getOperationLogsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (OperationLog[] memory logs) {
        require(offset < operationLogs.length, "AuditLogger: offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > operationLogs.length) {
            end = operationLogs.length;
        }
        
        logs = new OperationLog[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            logs[i - offset] = operationLogs[i];
        }
    }

    /**
     * @dev 按角色查询操作日志
     */
    function getOperationLogsByRole(
        bytes32 role,
        uint256 limit
    ) external view returns (OperationLog[] memory logs) {
        uint256 count = 0;
        
        // 计算匹配的日志数量
        for (uint256 i = 0; i < operationLogs.length && count < limit; i++) {
            if (operationLogs[i].role == role) {
                count++;
            }
        }
        
        logs = new OperationLog[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < operationLogs.length && index < count; i++) {
            if (operationLogs[i].role == role) {
                logs[index] = operationLogs[i];
                index++;
            }
        }
    }

    /**
     * @dev 获取审计报告历史
     */
    function getAuditReports() external view returns (AuditReport[] memory) {
        return auditReports;
    }

    /**
     * @dev 获取关键操作列表
     */
    function getCriticalOperations() external view returns (string[] memory) {
        return criticalOperationsList;
    }

    /**
     * @dev 获取日志统计信息
     */
    function getLogStatistics() external view returns (
        uint256 totalLogs,
        uint256 todayLogs,
        uint256 totalOperators,
        uint256 totalOperationTypes
    ) {
        totalLogs = operationLogs.length;
        
        uint256 today = block.timestamp / 1 days;
        todayLogs = dailyLogCounts[today];
        
        // 这里简化处理，实际实现可能需要更复杂的统计逻辑
        totalOperators = 0; // 需要遍历计算
        totalOperationTypes = 0; // 需要遍历计算
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-AuditLogger";
    }

    // ============ 内部函数 ============
    /**
     * @dev 内部函数：添加关键操作
     */
    function _addCriticalOperation(string memory operation) internal {
        if (!criticalOperations[operation]) {
            criticalOperations[operation] = true;
            criticalOperationsList.push(operation);
            emit CriticalOperationAdded(operation);
        }
    }

    /**
     * @dev 内部函数：触发归档
     */
    function _triggerArchive() internal {
        // 这里应该实现实际的归档逻辑
        // 可能包括将旧日志移动到IPFS或其他存储系统
        emit LogArchived(0, operationLogs.length / 2, "auto-archive");
    }
}
