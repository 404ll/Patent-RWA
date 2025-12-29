#  Patent RWA System

基于以太坊的专利真实世界资产(RWA)代币化平台，采用**多专利资产支撑单一 Patent 代币**的创新架构，符合HKMA监管要求。

## �️ 系统架构

### 核心架构图
```
┌─────────────────────────────────────────────────────────────────┐
│                      Patent RWA System                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    PatentCoin                      │ │
│  │                   统一专利资产代币                           │ │
│  │                                                             │ │
│  │ • ERC20 + ERC20Burnable + ERC20Pausable                    │ │
│  │ • UUPS可升级代理模式                                        │ │
│  │ • 基于角色的访问控制 (RBAC)                                 │ │
│  │ • 多专利资产支撑                                           │ │
│  │ • 统一收益分配机制                                         │ │
│  │ • HKMA合规功能 (黑名单/冻结/暂停)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    专利资产池                               │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │   专利 #1   │  │   专利 #2   │  │   专利 #3   │   ...   │ │
│  │  │ US10123456  │  │ US10789012  │  │ US10456789  │         │ │
│  │  │ 估值: $5M   │  │ 估值: $3M   │  │ 估值: $2M   │         │ │
│  │  │ 权重: 40%   │  │ 权重: 30%   │  │ 权重: 20%   │         │ │
│  │  │ IPFS元数据  │  │ IPFS元数据  │  │ IPFS元数据  │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    收益分配系统                             │ │
│  │                                                             │ │
│  │ • 多轮次收益分配                                           │ │
│  │ • 基于持币比例的公平分配                                   │ │
│  │ • 支持多种收益代币 (USDC/USDT/ETH)                        │ │
│  │ • 平台费用自动扣除 (2.5%)                                 │ │
│  │ • 防重复领取机制                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    外部集成                                 │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │ IPFS存储    │  │ 链上数据    │  │ 监管接口    │         │ │
│  │  │ • 专利文档  │  │ • 交易记录  │  │ • 合规报告  │         │ │
│  │  │ • 评估报告  │  │ • 收益分配  │  │ • 审计日志  │         │ │
│  │  │ • 合规文件  │  │ • 事件日志  │  │ • 监管查询  │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 智能合约架构

#### 核心合约
- **PatentCoin.sol** - 主合约，集成所有功能
  - ERC20代币标准实现
  - 多专利资产管理
  - 统一收益分配机制
  - HKMA合规功能
  - UUPS可升级架构

#### 辅助合约
- **TokenMetadataRegistry.sol** - EIP-5269元数据注册表
- **PatentVesting.sol** - 通用代币锁仓合约
- **PatentOracle.sol** - Chainlink预言机集成
- **PatentNFT.sol** - 专利证书NFT

### 前端应用架构

#### 核心组件
- **Dashboard** - 主仪表板，显示PATENT代币投资组合
- **PatentAssetViewer** - 专利资产池管理界面
- **RevenueStats** - 收益分配统计和领取
- **CompliancePanel** - 合规管理面板
- **AssetBackingRatio** - 资产支撑比率监控

## 🔧 技术实现方案

### 1. 多专利资产支撑架构

#### 统一代币模式
```solidity
contract PatentCoin is ERC20Upgradeable, AccessControlEnumerableUpgradeable {
    // 专利资产结构
    struct PatentAsset {
        string patentNumber;     // 专利号
        string title;           // 专利标题  
        string[] inventors;     // 发明人列表
        uint256 valuationUSD;   // 美元估值
        uint256 weight;         // 权重 (基点)
        bool active;            // 是否激活
        uint256 addedTimestamp; // 添加时间
        string ipfsMetadata;    // IPFS元数据哈希
    }
    
    mapping(string => PatentAsset) public patents;
    string[] public patentNumbers;
    uint256 public totalPatentValuation;
}
```

#### 资产支撑比率计算
```solidity
function getBackingRatio() external view returns (uint256) {
    if (totalSupply() == 0) return 0;
    return (totalPatentValuation * 1e18) / totalSupply();
}
```

### 2. 统一收益分配机制

#### 多轮次收益分配
```solidity
struct RevenueRound {
    uint256 totalAmount;       // 总收益金额
    uint256 timestamp;         // 分配时间
    address revenueToken;      // 收益代币地址
    mapping(address => bool) claimed; // 用户领取状态
    uint256 totalSupplySnapshot; // 总供应量快照
}

function distributeRevenue(uint256 totalRevenue, address revenueToken) external {
    // 计算平台费用 (2.5%)
    uint256 platformFee = (totalRevenue * platformFeeRate) / 10000;
    uint256 netRevenue = totalRevenue - platformFee;
    
    // 创建新的分配轮次
    currentRevenueRound++;
    RevenueRound storage round = revenueRounds[currentRevenueRound];
    round.totalAmount = netRevenue;
    round.revenueToken = revenueToken;
    round.totalSupplySnapshot = totalSupply();
}
```

#### 按比例收益领取
```solidity
function claimRevenue(uint256 roundId) external {
    RevenueRound storage round = revenueRounds[roundId];
    require(!round.claimed[msg.sender], "Already claimed");
    
    uint256 userBalance = balanceOf(msg.sender);
    uint256 userShare = (round.totalAmount * userBalance) / round.totalSupplySnapshot;
    
    round.claimed[msg.sender] = true;
    IERC20Upgradeable(round.revenueToken).transfer(msg.sender, userShare);
}
```

### 3. HKMA合规架构

#### 基于角色的访问控制
```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");
bytes32 public constant PATENT_MANAGER_ROLE = keccak256("PATENT_MANAGER_ROLE");
bytes32 public constant REVENUE_MANAGER_ROLE = keccak256("REVENUE_MANAGER_ROLE");
```

#### 合规功能实现
```solidity
// 黑名单机制
mapping(address => bool) private _blacklisted;

// 地址冻结机制
mapping(address => bool) private _frozen;

// 转账前检查
function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
    super._beforeTokenTransfer(from, to, amount);
    
    if (from != address(0) && to != address(0)) {
        require(!_blacklisted[from], "PatentCoin: sender is blacklisted");
        require(!_blacklisted[to], "PatentCoin: recipient is blacklisted");
        require(!_frozen[from], "PatentCoin: sender is frozen");
        require(!_frozen[to], "PatentCoin: recipient is frozen");
    }
}
```

### 4. 可升级架构

#### UUPS代理模式
```solidity
contract PatentCoin is UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {
        emit Upgraded(newImplementation);
    }
}
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- Hardhat >= 2.0
- MetaMask钱包
- IPFS节点(可选)

### 安装依赖
```bash
# 克隆项目
git clone <repository-url>
cd biopharma-patent-rwa

# 安装合约依赖
npm install

# 安装前端依赖
cd frontend
npm install
```

### 部署合约
```bash
# 编译合约
npx hardhat compile

# 部署到本地网络
npx hardhat node
npx hardhat run scripts/deploy-patentcoin.js --network localhost

# 部署到测试网
npx hardhat run scripts/deploy-patentcoin.js --network goerli
```

### 启动前端
```bash
cd frontend
npm start
```

## 📋 功能特性

### 专利资产管理
- **多专利支撑**: 多个专利资产支撑单一PATENT代币
- **动态权重**: 支持专利资产权重调整
- **实时估值**: 链上专利估值更新
- **IPFS存储**: 去中心化专利文档存储
- **资产支撑比率**: 实时计算资产支撑比率

### 收益分配
- **统一分配**: 所有专利收益汇集后统一分配
- **多轮次支持**: 支持多轮次收益分配
- **多币种支持**: 支持USDC/USDT/ETH等收益代币
- **平台费用**: 自动扣除平台费用(2.5%)
- **防重复领取**: 完善的防重复领取机制

### HKMA合规
- **角色分离**: 9种不同角色权限分离
- **黑名单机制**: 支持地址黑名单管理
- **地址冻结**: 支持单个地址冻结
- **全局暂停**: 紧急情况下全局暂停功能
- **审计日志**: 完整的事件日志记录

### 可升级性
- **UUPS代理**: 使用UUPS代理模式
- **权限控制**: 只有UPGRADER_ROLE可以升级
- **状态保持**: 升级时保持所有状态数据

## 📊 合约接口

### 专利资产管理
```solidity
// 添加专利资产
function addPatent(
    string memory patentNumber,
    string memory title,
    string[] memory inventors,
    uint256 valuationUSD,
    uint256 weight,
    string memory ipfsMetadata
) external onlyRole(PATENT_MANAGER_ROLE);

// 更新专利信息
function updatePatent(
    string memory patentNumber,
    uint256 newValuationUSD,
    uint256 newWeight,
    string memory newIpfsMetadata
) external onlyRole(PATENT_MANAGER_ROLE);

// 停用专利
function deactivatePatent(string memory patentNumber) 
    external onlyRole(PATENT_MANAGER_ROLE);
```

### 收益分配
```solidity
// 分配收益
function distributeRevenue(uint256 totalRevenue, address revenueToken) 
    external onlyRole(REVENUE_MANAGER_ROLE);

// 领取收益
function claimRevenue(uint256 roundId) external;

// 查询可领取收益
function getClaimableRevenue(address user, uint256 roundId) 
    external view returns (uint256);
```

### 查询功能
```solidity
// 获取专利资产详情
function getPatent(string memory patentNumber) 
    external view returns (PatentAsset memory);

// 获取所有专利号
function getAllPatentNumbers() external view returns (string[] memory);

// 获取资产支撑比率
function getBackingRatio() external view returns (uint256);

// 获取专利数量
function getPatentCount() external view returns (uint256);
```

### 合规功能
```solidity
// 黑名单管理
function addToBlacklist(address account) external onlyRole(BLACKLISTER_ROLE);
function removeFromBlacklist(address account) external onlyRole(BLACKLISTER_ROLE);
function isBlacklisted(address account) external view returns (bool);

// 地址冻结
function freezeAddress(address account) external onlyRole(FREEZER_ROLE);
function unfreezeAddress(address account) external onlyRole(FREEZER_ROLE);
function isFrozen(address account) external view returns (bool);

// 暂停控制
function pause() external onlyRole(PAUSER_ROLE);
function unpause() external onlyRole(RESUME_ROLE);
```

## 📁 项目结构

```
├── contracts/                    # 智能合约
│   ├── PatentCoin.sol            # 主合约 - 多专利资产支撑的PATENT代币
│   ├── TokenMetadataRegistry.sol # 元数据注册表
│   ├── PatentVesting.sol        # 通用代币锁仓合约
│   ├── PatentOracle.sol         # 预言机合约
│   ├── PatentNFT.sol            # 专利证书NFT
│   ├── interfaces/              # 合约接口
│   │   └── IEIP5269.sol         # EIP-5269元数据接口
│   └── mocks/                   # 测试用模拟合约
│       └── MockERC20.sol        # 模拟ERC20代币
├── scripts/                     # 部署脚本
│   └── deploy-patentcoin.js      # PatentCoin部署脚本
├── test/                        # 测试文件
│   └── PatentCoin.test.js        # 完整测试套件
├── frontend/                    # React前端
│   ├── src/
│   │   ├── components/          # React组件
│   │   │   ├── Dashboard.tsx    # 主仪表板
│   │   │   ├── PatentAssetViewer.tsx # 专利资产查看器
│   │   │   ├── RevenueStats.tsx # 收益统计
│   │   │   └── CompliancePanel.tsx # 合规管理面板
│   │   ├── services/            # 服务层
│   │   │   ├── ipfs.ts          # IPFS服务
│   │   │   └── contracts.ts     # 合约交互
│   │   └── hooks/               # React Hooks
│   └── package.json             # 前端依赖
├── docs/                        # 文档
│   └── PatentCoin-Documentation.md # 详细技术文档
├── hardhat.config.js            # Hardhat配置
├── package.json                 # 项目依赖
└── README.md                    # 项目说明
```

## 🎨 前端组件示例

### 专利资产池查看器
```typescript
const PatentAssetViewer: React.FC = () => {
  const { data: patentCount } = useContractRead({
    address: PATENTCOIN_ADDRESS,
    abi: patentCoinABI,
    functionName: 'getPatentCount',
  });

  const { data: totalValuation } = useContractRead({
    address: PATENTCOIN_ADDRESS,
    abi: patentCoinABI,
    functionName: 'totalPatentValuation',
  });

  const { data: backingRatio } = useContractRead({
    address: PATENTCOIN_ADDRESS,
    abi: patentCoinABI,
    functionName: 'getBackingRatio',
  });

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">专利资产池</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{patentCount?.toString()}</p>
          <p className="text-sm text-gray-500">专利数量</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            ${formatEther(totalValuation || 0)}M
          </p>
          <p className="text-sm text-gray-500">总估值</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            ${formatEther(backingRatio || 0)}
          </p>
          <p className="text-sm text-gray-500">支撑比率</p>
        </div>
      </div>
    </div>
  );
};
```

### 收益领取组件
```typescript
const RevenueClaimCard: React.FC<{ roundId: number }> = ({ roundId }) => {
  const { address } = useAccount();
  
  const { data: claimableAmount } = useContractRead({
    address: PATENTCOIN_ADDRESS,
    abi: patentCoinABI,
    functionName: 'getClaimableRevenue',
    args: [address, roundId],
  });

  const { write: claimRevenue } = useContractWrite({
    address: PATENTCOIN_ADDRESS,
    abi: patentCoinABI,
    functionName: 'claimRevenue',
    args: [roundId],
  });

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium">第 {roundId} 轮收益</h4>
          <p className="text-sm text-gray-500">
            可领取: {formatUnits(claimableAmount || 0, 6)} USDC
          </p>
        </div>
        <button
          onClick={() => claimRevenue?.()}
          disabled={!claimableAmount || claimableAmount.isZero()}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          领取收益
        </button>
      </div>
    </div>
  );
};
```

## 🔒 安全特性

### 重入攻击防护
- 所有状态变更函数使用`nonReentrant`修饰符
- 遵循检查-效果-交互模式

### 权限分离
- 9种不同角色，权限完全分离
- 没有单一地址拥有所有权限
- 管理员可以分配和撤销角色

### 升级安全
- 只有UPGRADER_ROLE可以执行升级
- 使用UUPS模式，升级逻辑在实现合约中
- 升级时保持所有状态数据

### 输入验证
- 所有函数进行严格的输入验证
- 防止零地址和无效参数
- 数值范围检查

## 📈 经济模型

### 资产支撑机制
- **支撑比率** = 专利总估值 / PATENT代币总供应量
- **动态调整**: 专利估值变化时自动更新支撑比率
- **透明计算**: 链上实时计算，完全透明

### 收益分配模型
- **收益来源**: 专利许可费、专利转让收入等
- **分配方式**: 按持币比例公平分配
- **平台费用**: 2.5%平台费用，用于运营维护
- **多币种支持**: 支持USDC、USDT、ETH等多种收益代币

### 费用结构
- **平台费用**: 2.5% (可调整，最高10%)
- **Gas费用**: 用户承担链上交互Gas费用
- **无额外费用**: 无铸币费、转账费等额外费用

---

⚠️ **风险提示**: 本项目涉及区块链技术和数字资产，存在技术风险、市场风险和监管风险。请在充分了解相关风险的基础上谨慎参与。本项目仅供学习和研究使用，不构成投资建议。
