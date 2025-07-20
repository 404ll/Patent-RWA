# BioPharma Patent RWA System

基于以太坊的生物医药专利真实世界资产(RWA)代币化平台，支持专利资产上链、收益分配、DAO治理等功能。

## 🏗️ 系统架构

### 智能合约
- **PatentToken.sol** - ERC20专利代币合约
- **PatentVesting.sol** - 代币释放/锁仓合约  
- **RevenueDistribution.sol** - 专利收益自动分配
- **PatentDAO.sol** - DAO治理与资产管理
- **PatentOracle.sol** - Chainlink预言机集成

### 前端应用
- React + TypeScript
- Wagmi + Ethers.js Web3集成
- TailwindCSS UI框架
- IPFS元数据存储

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- Hardhat
- MetaMask钱包

### 安装依赖
```bash
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
npx hardhat run scripts/deploy.js --network localhost

# 部署到测试网
npx hardhat run scripts/deploy.js --network goerli
```

### 启动前端
```bash
cd frontend
npm start
```

## 📋 功能特性

### 专利代币化
- 专利资产ERC20代币化
- IPFS元数据存储(评估报告、合规文件)
- 链上专利估值管理

### 收益分配
- 基于持币比例的自动收益分配
- 支持USDC/USDT稳定币分配
- 快照机制确保公平分配

### DAO治理
- 基于OpenZeppelin Governor的DAO治理
- 资金库管理与提案投票
- 代币持有者参与决策

### Vesting机制
- 灵活的代币释放计划
- 支持cliff期和线性释放
- 可撤销的vesting安排

## 🔧 配置说明

### 环境变量
创建 `.env` 文件：
```env
# 私钥
PRIVATE_KEY=your_private_key

# Infura项目ID
INFURA_PROJECT_ID=your_infura_id

# IPFS配置
REACT_APP_IPFS_PROJECT_ID=your_ipfs_project_id
REACT_APP_IPFS_SECRET=your_ipfs_secret

# 合约地址
REACT_APP_PATENT_TOKEN_ADDRESS=0x...
REACT_APP_REVENUE_DISTRIBUTION_ADDRESS=0x...
```

### 网络配置
支持的网络：
- Ethereum Mainnet
- Goerli Testnet
- Localhost (Hardhat)

## 📊 合约接口

### PatentToken
```solidity
// 专利代币化
function tokenizePatent(uint256 patentId, string memory ipfsHash, uint256 tokenAmount, uint256 valuationUSD)

// 查询专利信息
function patents(uint256 patentId) returns (PatentMetadata)
```

### RevenueDistribution
```solidity
// 分配收益
function distributeRevenue(uint256 amount)

// 领取收益
function claimRevenue(uint256 roundId)
```

### PatentDAO
```solidity
// 创建提案
function propose(address[] targets, uint256[] values, bytes[] calldatas, string description)

// 投票
function castVote(uint256 proposalId, uint8 support)
```

## 🔐 安全考虑

- 使用OpenZeppelin安全合约库
- ReentrancyGuard防重入攻击
- Pausable紧急暂停机制
- 多重签名钱包管理
- 代码审计建议

## 📁 项目结构

```
├── contracts/              # 智能合约
│   ├── PatentToken.sol
│   ├── PatentVesting.sol
│   ├── RevenueDistribution.sol
│   ├── PatentDAO.sol
│   └── PatentOracle.sol
├── scripts/                # 部署脚本
│   └── deploy.js
├── frontend/               # React前端
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.tsx
│   └── public/
├── test/                   # 测试文件
└── hardhat.config.js       # Hardhat配置
```

## 🧪 测试

```bash
# 运行合约测试
npx hardhat test

# 测试覆盖率
npx hardhat coverage

# Gas报告
npx hardhat test --gas-reporter
```

## 📈 路线图

- [ ] 多链部署支持
- [ ] NFT专利证书
- [ ] 流动性挖矿机制
- [ ] 专利交易市场
- [ ] 移动端应用

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

- 项目主页: [GitHub Repository]
- 文档: [Documentation]
- 社区: [Discord/Telegram]

---

⚠️ **风险提示**: 本项目仅供学习和研究使用，投资有风险，请谨慎参与。