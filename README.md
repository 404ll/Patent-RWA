# BioPharma Patent RWA System

基于以太坊的生物医药专利真实世界资产(RWA)代币化平台，每个专利发行独立的ERC20代币，支持专利资产上链、收益分配等功能。

## 🏗️ 系统架构

### 核心架构图
```
┌─────────────────────────────────────────────────────────────────┐
│                    BioPharma Patent RWA System                  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │PatentAssetToken │  │ TokenMetadata   │  │PatentAssetToken │  │
│  │   (专利币#1)    │  │   Registry      │  │   (专利币#2)    │  │
│  │                 │  │  (EIP-5269)     │  │                 │  │
│  │ • ERC20         │  │                 │  │ • ERC20         │  │
│  │ • ERC20Permit   │  │ • 元数据管理    │  │ • ERC20Permit   │  │
│  │ • ERC20Snapshot │  │ • IPFS集成      │  │ • ERC20Snapshot │  │
│  │ • 专利代币化    │  │ • 版本控制      │  │ • 专利代币化    │  │
│  │ • 收益分配      │  │                 │  │ • 收益分配      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │PatentAssetToken │  │PatentAssetToken │  │   PatentVesting │  │
│  │   Factory       │  │   (专利币#N)    │  │  (通用锁仓)     │  │
│  │                 │  │                 │  │                 │  │
│  │ • 批量创建      │  │ • ERC20         │  │ • 多代币支持    │  │
│  │ • 统一管理      │  │ • 收益分配      │  │ • 线性释放      │  │
│  │ • 权限控制      │  │ • 元数据集成    │  │ • Cliff机制     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   IPFS存储      │  │   链上数据      │  │   外部数据      │  │
│  │                 │  │                 │  │                 │  │
│  │ • 专利文档      │  │ • 交易记录      │  │ • 价格信息      │  │
│  │ • 评估报告      │  │ • 收益分配      │  │ • 市场数据      │  │
│  │ • 合规文件      │  │ • 事件日志      │  │ • 监管信息      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 智能合约架构

#### 核心合约
- **PatentAssetToken.sol** - 专利资产代币合约，集成ERC20、收益分配、元数据管理
- **PatentAssetTokenFactory.sol** - 专利代币工厂，批量创建和管理专利代币
- **TokenMetadataRegistry.sol** - EIP-5269元数据注册表，统一管理代币元数据
- **PatentVesting.sol** - 通用代币锁仓合约，支持任意ERC20代币

#### 扩展合约
- **PatentOracle.sol** - Chainlink预言机集成，提供外部数据
- **PatentNFT.sol** - 专利证书NFT，提供所有权证明

### 前端应用架构

#### 核心组件
- **Dashboard** - 主仪表板，显示所有专利代币投资组合
- **PatentTokenCard** - 专利代币卡片，展示单个专利的持仓和操作
- **MetadataViewer** - EIP-5269元数据管理界面
- **RevenueStats** - 收益分配统计和领取
- **VestingManagement** - 多代币锁仓和释放管理

## 🔧 技术实现方案

### 1. 专利代币化架构

#### 一专利一代币模式
```solidity
// 每个专利独立发行ERC20代币
contract PatentAssetToken is ERC20, ERC20Permit, ERC20Snapshot, IEIP5269 {
    struct PatentInfo {
        string patentNumber;     // 专利号
        string title;           // 专利标题  
        uint256 valuationUSD;   // 美元估值
        uint256 tokenizedAmount; // 代币化数量
        bool active;            // 是否激活
        address revenueToken;   // 收益分配代币地址
    }
    
    // 集成收益分配功能
    function distributeRevenue(uint256 totalRevenue) external;
    function claimRevenue(uint256 roundId) external;
}
```

#### 工厂模式批量创建
```solidity
contract PatentAssetTokenFactory {
    function createPatentToken(
        string memory name,
        string memory symbol, 
        string memory patentNumber,
        string memory title,
        uint256 valuationUSD,
        uint256 tokenizedAmount,
        address revenueToken
    ) external returns (address);
}
```

### 2. 收益分配机制

#### 基于快照的公平分配
```solidity
// 使用ERC20Snapshot确保分配公平性
function distributeRevenue(uint256 totalRevenue) external onlyOwner {
    uint256 snapshotId = _snapshot();
    currentDistributionRound++;
    
    DistributionRound storage round = distributionRounds[currentDistributionRound];
    round.totalAmount = totalRevenue;
    round.snapshotId = snapshotId;
    round.timestamp = block.timestamp;
    
    emit RevenueDistributed(currentDistributionRound, totalRevenue, snapshotId);
}

function claimRevenue(uint256 roundId) external {
    DistributionRound storage round = distributionRounds[roundId];
    uint256 userBalance = balanceOfAt(msg.sender, round.snapshotId);
    uint256 totalSupplyAtSnapshot = totalSupplyAt(round.snapshotId);
    uint256 userShare = (round.totalAmount * userBalance) / totalSupplyAtSnapshot;
    
    // 转账收益代币给用户
    IERC20(patentInfo.revenueToken).transfer(msg.sender, userShare);
}
```

### 3. 通用Vesting机制

#### 支持多代币锁仓
```solidity
contract PatentVesting {
    mapping(address => mapping(address => VestingSchedule)) public vestingSchedules;
    
    function createVestingSchedule(
        address beneficiary,
        address token,        // 支持任意ERC20代币
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration,
        bool revocable
    ) external;
}
```

### 平台费用机制

#### 简化的费用模型
- **可选平台费用**: 每个专利代币可设置0-10%的平台费用
- **直接转账**: 费用直接转给指定的接收地址
- **透明计算**: 费用在收益分配时自动扣除
- **灵活配置**: 可随时调整费用率和接收地址

```solidity
// 费用计算示例
function distributeRevenue(uint256 totalRevenue) external {
    uint256 platformFee = (totalRevenue * platformFeeRate) / 10000;
    uint256 netRevenue = totalRevenue - platformFee;
    
    // 分配净收益给代币持有者
    // 转移平台费用给指定地址
}
```

#### 费用用途
- 平台运营和维护
- 技术开发和升级
- 合规和法律支持
- 市场推广和生态建设

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
npx hardhat run scripts/deploy-with-metadata.js --network localhost

# 部署到测试网
npx hardhat run scripts/deploy-with-metadata.js --network goerli
```

### 启动前端
```bash
cd frontend
npm start
```

## 📋 功能特性

### 专利代币化
- **一专利一代币**: 每个专利发行独立的ERC20代币
- **工厂模式**: 批量创建和管理专利代币
- **元数据集成**: EIP-5269标准化元数据管理
- **IPFS存储**: 去中心化文档存储
- **动态估值**: 链上专利估值更新

### 收益分配
- **快照机制**: ERC20Snapshot确保分配公平性
- **自动分配**: 基于持币比例的智能收益分配
- **多币种支持**: 支持USDC/USDT/ETH等收益代币
- **批量处理**: 支持批量收益分配
- **一键领取**: 简化的收益领取流程

### 通用Vesting
- **多代币支持**: 支持任意ERC20代币锁仓
- **灵活配置**: 支持cliff期、线性释放等模式
- **批量管理**: 支持批量创建vesting计划
- **可撤销设计**: 支持可撤销的vesting安排

## 📊 合约接口

### PatentAssetToken
```solidity
// 专利信息管理
function updatePatentInfo(string memory title, uint256 valuationUSD) external;
function deactivatePatent() external;

// 收益分配
function distributeRevenue(uint256 totalRevenue) external;
function claimRevenue(uint256 roundId) external;
function getClaimableRevenue(address user, uint256 roundId) external view returns (uint256);

// EIP-5269元数据接口
function tokenURI(uint256 tokenId) external view returns (string memory);
function updateMetadata(string calldata ipfsHash) external;
```

### PatentAssetTokenFactory
```solidity
// 创建专利代币
function createPatentToken(
    string memory name,
    string memory symbol,
    string memory patentNumber, 
    string memory title,
    uint256 valuationUSD,
    uint256 tokenizedAmount,
    address revenueToken
) external returns (address);

// 查询功能
function getDeployedTokensCount() external view returns (uint256);
function getTokenByPatentNumber(string memory patentNumber) external view returns (address);
```

### PatentVesting
```solidity
// 创建锁仓计划
function createVestingSchedule(
    address beneficiary,
    address token,
    uint256 totalAmount,
    uint256 startTime,
    uint256 duration,
    uint256 cliffDuration,
    bool revocable
) external;

// 释放代币
function release(address token) external;
function releasableAmount(address beneficiary, address token) external view returns (uint256);

// 查询功能
function getBeneficiaryTokens(address beneficiary) external view returns (address[] memory);
```

## 📁 项目结构

```
├── contracts/                    # 智能合约
│   ├── interfaces/               # 合约接口
│   │   └── IEIP5269.sol         # EIP-5269元数据接口
│   ├── PatentAssetToken.sol     # 专利资产代币
│   ├── PatentAssetTokenFactory.sol # 专利代币工厂
│   ├── TokenMetadataRegistry.sol # 元数据注册表
│   ├── PatentVesting.sol        # 通用代币锁仓合约
│   ├── PatentOracle.sol         # 预言机合约
│   └── PatentNFT.sol            # 专利证书NFT
├── scripts/                     # 部署脚本
│   └── deploy-with-metadata.js  # 完整部署脚本
├── frontend/                    # React前端
│   ├── src/
│   │   ├── components/          # React组件
│   │   │   ├── Dashboard.tsx    # 主仪表板
│   │   │   ├── PatentTokenCard.tsx # 专利代币卡片
│   │   │   ├── MetadataViewer.tsx # 元数据管理
│   │   │   └── VestingManagement.tsx # Vesting管理
│   │   ├── services/            # 服务层
│   │   │   ├── ipfs.ts          # IPFS服务
│   │   │   └── contracts.ts     # 合约交互
│   │   └── hooks/               # React Hooks
│   └── package.json             # 前端依赖
├── test/                        # 测试文件
├── docs/                        # 文档
├── hardhat.config.js            # Hardhat配置
├── package.json                 # 项目依赖
└── README.md                    # 项目说明
```

## 🎨 前端组件示例

### 专利代币卡片
```typescript
const PatentTokenCard: React.FC<{ tokenAddress: string }> = ({ tokenAddress }) => {
  const { data: patentInfo } = useContractRead({
    address: tokenAddress,
    abi: patentAssetTokenABI,
    functionName: 'patentInfo',
  });

  const { data: balance } = useBalance({
    address: userAddress,
    token: tokenAddress,
  });

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium">{patentInfo?.title}</h3>
      <p className="text-sm text-gray-500">专利号: {patentInfo?.patentNumber}</p>
      <p className="text-sm">持有: {balance?.formatted} 代币</p>
      
      <div className="mt-4 flex space-x-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          领取收益
        </button>
        <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded">
          查看详情
        </button>
      </div>
    </div>
  );
};
```

---

⚠️ **风险提示**: 本项目涉及区块链技术和数字资产，存在技术风险、市场风险和监管风险。请在充分了解相关风险的基础上谨慎参与。本项目仅供学习和研究使用，不构成投资建议。
