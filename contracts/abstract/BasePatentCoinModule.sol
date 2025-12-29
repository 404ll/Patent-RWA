// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title BasePatentCoinModule
 * @dev PatentCoin模块的基础抽象合约，提供通用功能和安全机制
 */
abstract contract BasePatentCoinModule is
    Initializable,
    AccessControlEnumerableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ 角色定义 ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE");
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");
    bytes32 public constant WHITELISTER_ROLE = keccak256("WHITELISTER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PATENT_MANAGER_ROLE =
        keccak256("PATENT_MANAGER_ROLE");
    bytes32 public constant REVENUE_MANAGER_ROLE =
        keccak256("REVENUE_MANAGER_ROLE");
    bytes32 public constant RESERVE_MANAGER_ROLE =
        keccak256("RESERVE_MANAGER_ROLE");
    bytes32 public constant REDEMPTION_PROCESSOR_ROLE =
        keccak256("REDEMPTION_PROCESSOR_ROLE");

    // ============ 状态变量 ============
    address public patentCoinContract;
    mapping(address => bool) public authorizedMultisigs;

    // ============ 事件 ============
    event PatentCoinContractUpdated(
        address indexed oldContract,
        address indexed newContract
    );
    event MultisigAuthorized(address indexed multisig, bool authorized);

    // ============ 修饰符 ============
    modifier onlyPatentCoin() {
        require(
            msg.sender == patentCoinContract,
            "BaseModule: caller is not PatentCoin contract"
        );
        _;
    }

    modifier onlyAuthorizedMultisig() {
        require(
            authorizedMultisigs[msg.sender],
            "BaseModule: caller is not authorized multisig"
        );
        _;
    }

    modifier onlyRoleMultisig(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "BaseModule: caller does not have required role"
        );
        require(
            authorizedMultisigs[msg.sender],
            "BaseModule: caller is not authorized multisig"
        );
        _;
    }

    // ============ 初始化函数 ============
    function __BasePatentCoinModule_init(
        address _patentCoinContract,
        address admin
    ) internal onlyInitializing {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();

        require(
            _patentCoinContract != address(0),
            "BaseModule: PatentCoin contract cannot be zero address"
        );
        require(
            admin != address(0),
            "BaseModule: admin cannot be zero address"
        );

        patentCoinContract = _patentCoinContract;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ============ 管理函数 ============
    /**
     * @dev 更新PatentCoin合约地址（仅管理员）
     */
    function setPatentCoinContract(
        address _patentCoinContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _patentCoinContract != address(0),
            "BaseModule: PatentCoin contract cannot be zero address"
        );

        address oldContract = patentCoinContract;
        patentCoinContract = _patentCoinContract;

        emit PatentCoinContractUpdated(oldContract, _patentCoinContract);
    }

    /**
     * @dev 授权/取消授权多签钱包（仅管理员）
     */
    function setMultisigAuthorization(
        address multisig,
        bool authorized
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            multisig != address(0),
            "BaseModule: multisig cannot be zero address"
        );

        authorizedMultisigs[multisig] = authorized;
        emit MultisigAuthorized(multisig, authorized);
    }

    /**
     * @dev 批量授权多签钱包（仅管理员）
     */
    function batchSetMultisigAuthorization(
        address[] calldata multisigs,
        bool[] calldata authorizations
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            multisigs.length == authorizations.length,
            "BaseModule: arrays length mismatch"
        );

        for (uint256 i = 0; i < multisigs.length; i++) {
            require(
                multisigs[i] != address(0),
                "BaseModule: multisig cannot be zero address"
            );
            authorizedMultisigs[multisigs[i]] = authorizations[i];
            emit MultisigAuthorized(multisigs[i], authorizations[i]);
        }
    }

    // ============ 查询函数 ============
    /**
     * @dev 检查地址是否为授权的多签钱包
     */
    function isAuthorizedMultisig(
        address wallet
    ) external view virtual returns (bool) {
        return authorizedMultisigs[wallet];
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    // ============ 内部辅助函数 ============
    /**
     * @dev 验证地址不为零地址
     */
    function _requireNonZeroAddress(
        address addr,
        string memory errorMessage
    ) internal pure {
        require(addr != address(0), errorMessage);
    }

    /**
     * @dev 验证数组长度匹配
     */
    function _requireArrayLengthMatch(
        uint256 length1,
        uint256 length2,
        string memory errorMessage
    ) internal pure {
        require(length1 == length2, errorMessage);
    }

    /**
     * @dev 验证数值大于零
     */
    function _requirePositiveValue(
        uint256 value,
        string memory errorMessage
    ) internal pure {
        require(value > 0, errorMessage);
    }

    /**
     * @dev 验证字符串不为空
     */
    function _requireNonEmptyString(
        string memory str,
        string memory errorMessage
    ) internal pure {
        require(bytes(str).length > 0, errorMessage);
    }
}
