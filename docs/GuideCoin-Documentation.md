# GuideCoin - HKMA合规稳定币智能合约

## 概述

GuideCoin是一个完全符合香港金融管理局(HKMA)稳定币发行指引的可升级ERC20代币合约。该合约采用OpenZeppelin的标准库构建，实现了全面的监管合规功能。

## 核心特性

### 1. 基础标准
- **代币名称**: GUIDE Coin
- **代币符号**: GUIDE
- **标准**: ERC20兼容
- **可升级性**: UUPS (ERC1967) 代理模式

### 2. 访问控制系统

采用基于角色的访问控制(RBAC)，确保权限分离：

```solidity
// 角色定义
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");        // 铸币权限
bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");        // 销毁权限
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");        // 暂停权限
bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE");        // 恢复权限
bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE"); // 黑名单权限
bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");      // 冻结权限
bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");    // 升级权限
```

### 3. 监管合规功能

#### 3.1 暂停机制
- `pause()`: 暂停所有代币转账 (需要PAUSER_ROLE)
- `unpause()`: 恢复代币转账 (需要RESUME_ROLE)

#### 3.2 铸币和销毁
- `mint(address to, uint256 amount)`: 铸造代币 (需要MINTER_ROLE)
- `burnFrom(address account, uint256 amount)`: 销毁代币 (需要BURNER_ROLE)

#### 3.3 黑名单机制
- `addToBlacklist(address account)`: 添加到黑名单 (需要BLACKLISTER_ROLE)
- `removeFromBlacklist(address account)`: 从黑名单移除 (需要BLACKLISTER_ROLE)
- `isBlacklisted(address account)`: 查询黑名单状态

#### 3.4 地址冻结机制
- `freezeAddress(address account)`: 冻结地址 (需要FREEZER_ROLE)
- `unfreezeAddress(address account)`: 解冻地址 (需要FREEZER_ROLE)
- `isFrozen(address account)`: 查询冻结状态

### 4. 事件日志

所有特权操作都会发出相应事件，确保可审计性：

```solidity
// 监管事件
event AddressBlacklisted(address indexed account, address indexed operator);
event AddressUnblacklisted(address indexed account, address indexed operator);
event AddressFrozen(address indexed account, address indexed operator);
event AddressUnfrozen(address indexed account, address indexed operator);
event TokensMinted(address indexed to, uint256 amount, address indexed minter);
event TokensBurned(address indexed from, uint256 amount, address indexed burner);
event ContractPaused(address indexed pauser);
event ContractUnpaused(address indexed resumer);
event Upgraded(address indexed implementation);
```

## 部署指南

### 1. 环境准备

```bash
# 安装依赖
npm install @openzeppelin/contracts-upgradeable
npm install @openzeppelin/hardhat-upgrades

# 配置Hardhat
npm install --save-dev @nomicfoundation/hardhat-toolbox
```

### 2. 部署合约

```bash
# 编译合约
npx hardhat compile

# 部署到本地网络
npx hardhat run scripts/deploy-guidecoin.js --network localhost

# 部署到测试网
npx hardhat run scripts/deploy-guidecoin.js --network goerli
```

### 3. 初始化参数

部署时需要指定以下角色地址：
- `admin`: 默认管理员角色
- `minter`: 铸币者
- `pauser`: 暂停者
- `resumer`: 恢复者
- `blacklister`: 黑名单管理者
- `freezer`: 冻结管理者
- `upgrader`: 升级者

## 使用示例

### 1. 铸造代币

```javascript
// 连接到minter账户
const minterContract = guideCoin.connect(minter);

// 铸造1000个GUIDE代币给用户
const amount = ethers.utils.parseEther("1000");
await minterContract.mint(userAddress, amount);
```

### 2. 黑名单管理

```javascript
// 连接到blacklister账户
const blacklisterContract = guideCoin.connect(blacklister);

// 添加地址到黑名单
await blacklisterContract.addToBlacklist(suspiciousAddress);

// 检查黑名单状态
const isBlacklisted = await guideCoin.isBlacklisted(suspiciousAddress);

// 从黑名单移除
await blacklisterContract.removeFromBlacklist(suspiciousAddress);
```

### 3. 地址冻结

```javascript
// 连接到freezer账户
const freezerContract = guideCoin.connect(freezer);

// 冻结地址
await freezerContract.freezeAddress(targetAddress);

// 检查冻结状态
const isFrozen = await guideCoin.isFrozen(targetAddress);

// 解冻地址
await freezerContract.unfreezeAddress(targetAddress);
```

### 4. 合约升级

```javascript
// 使用upgrader账户升级合约
const GuideCoinV2 = await ethers.getContractFactory("GuideCoinV2");
const upgraded = await upgrades.upgradeProxy(proxyAddress, GuideCoinV2);
```

## 安全考虑

### 1. 权限分离
- 每个角色都有特定的权限范围
- 没有单一地址拥有所有权限
- 管理员角色可以分配和撤销其他角色

### 2. 重入攻击防护
- 所有状态变更函数都使用`nonReentrant`修饰符
- 遵循检查-效果-交互模式

### 3. 升级安全
- 只有UPGRADER_ROLE可以执行升级
- 使用UUPS模式，升级逻辑在实现合约中

### 4. 输入验证
- 所有函数都进行严格的输入验证
- 防止零地址和无效参数

## 合规性

### HKMA指引合规性检查清单

- ✅ **身份验证**: 通过角色系统实现
- ✅ **交易监控**: 通过事件日志实现
- ✅ **资金冻结**: 通过冻结机制实现
- ✅ **黑名单管理**: 通过黑名单机制实现
- ✅ **紧急暂停**: 通过暂停机制实现
- ✅ **审计追踪**: 通过完整的事件日志实现
- ✅ **升级能力**: 通过UUPS代理模式实现
- ✅ **权限分离**: 通过RBAC系统实现

## API参考

### 核心函数

#### 代币操作
```solidity
function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE)
function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE)
```

#### 暂停控制
```solidity
function pause() external onlyRole(PAUSER_ROLE)
function unpause() external onlyRole(RESUME_ROLE)
```

#### 黑名单管理
```solidity
function addToBlacklist(address account) external onlyRole(BLACKLISTER_ROLE)
function removeFromBlacklist(address account) external onlyRole(BLACKLISTER_ROLE)
function isBlacklisted(address account) external view returns (bool)
```

#### 冻结管理
```solidity
function freezeAddress(address account) external onlyRole(FREEZER_ROLE)
function unfreezeAddress(address account) external onlyRole(FREEZER_ROLE)
function isFrozen(address account) external view returns (bool)
```

#### 工具函数
```solidity
function version() external pure returns (string memory)
function getImplementation() external view returns (address)
function getRoleMembers(bytes32 role) external view returns (address[] memory)
```

## 测试

运行完整的测试套件：

```bash
npx hardhat test test/GuideCoin.test.js
```

测试覆盖：
- 初始化和角色分配
- 铸币和销毁功能
- 黑名单机制
- 冻结机制
- 暂停功能
- 升级功能
- 访问控制
- 事件发出

## 许可证

MIT License - 详见LICENSE文件