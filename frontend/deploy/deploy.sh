elemen@ElemendeMacBook-Air rwa % npx hardhat run scripts/deploy-modular-patentcoin.js --network sepolia
Warning: Unused function parameter. Remove or comment out the variable name to silence this warning.
   --> contracts/modules/RevenueDistributor.sol:269:9:
    |
269 |         uint256 totalPending
    |         ^^^^^^^^^^^^^^^^^^^^


Warning: Contract code size is 123607 bytes and exceeds 24576 bytes (a limit introduced in Spurious Dragon). This contract may not be deployable on Mainnet. Consider enabling the optimizer (with a low "runs" value!), turning off revert strings, or using libraries.
  --> contracts/deployment/DeploymentHelper.sol:17:1:
   |
17 | contract DeploymentHelper {
   | ^ (Relevant source part starts here and spans across multiple lines).


Compiled 2 Solidity files successfully (evm target: paris).
Deploying PatentCoin Modular System...
Deploying contracts with the account: 0x9A2717A1ddd7C38621806286038A426BE9944565
Account balance: 12040179963835532220

=== 部署模块合约 ===
部署 RoleManager...
初始化参数: {
  patentCoinContract: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  admin: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  minter: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  burner: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  pauser: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  resumer: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  freezer: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  whitelister: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  blacklister: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  upgrader: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  patentManager: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  revenueManager: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  reserveManager: '0x9A2717A1ddd7C38621806286038A426BE9944565',
  redemptionProcessor: '0x9A2717A1ddd7C38621806286038A426BE9944565'
}
RoleManager deployed to: 0xEaD04C834c959De017cDC2bA3c792A1C044600f1
部署 ComplianceManager...
ComplianceManager deployed to: 0x0Cd1530d6Cc14252392C1816aC7490f116949c2E
部署 PatentAssetManager...
PatentAssetManager deployed to: 0x8BDe84b49f208fA1A0D7506ECd0b3A2Dcb4aD9d2
部署 ReserveAssetManager...
ReserveAssetManager deployed to: 0x23c644416479c9854ACE97aA782d223Afaa3358A
部署 RevenueDistributor...
RevenueDistributor deployed to: 0x9622A1efc99613ef8cc9837bd9AF18ca06511f7b
部署 RedemptionManager...
RedemptionManager deployed to: 0x4Efff2BE104b319E0e7EdebaB9B24BCd5b54DC10
部署 AuditLogger...
AuditLogger deployed to: 0x96EE26fC932cf6d39076347F62E2b0C0c0509399

=== 部署主合约 ===
部署 PatentCoinModular...
Warning: A proxy admin was previously deployed on this network

    This is not natively used with the current kind of proxy ('uups').
    Changes to the admin will have no effect on this new proxy.

PatentCoinModular deployed to: 0xA29057f94EAEda93020664032D4a5A2da2DDa488

=== 更新模块引用 ===
更新 RoleManager 引用...
更新 ComplianceManager 引用...
更新 PatentAssetManager 引用...
更新 ReserveAssetManager 引用...
更新 RevenueDistributor 引用...
更新 RedemptionManager 引用...
更新 AuditLogger 引用...

=== 部署完成 ===
PatentCoin Modular System deployed successfully!

合约地址:
PatentCoinModular: 0xA29057f94EAEda93020664032D4a5A2da2DDa488
RoleManager: 0xEaD04C834c959De017cDC2bA3c792A1C044600f1
ComplianceManager: 0x0Cd1530d6Cc14252392C1816aC7490f116949c2E
PatentAssetManager: 0x8BDe84b49f208fA1A0D7506ECd0b3A2Dcb4aD9d2
ReserveAssetManager: 0x23c644416479c9854ACE97aA782d223Afaa3358A
RevenueDistributor: 0x9622A1efc99613ef8cc9837bd9AF18ca06511f7b
RedemptionManager: 0x4Efff2BE104b319E0e7EdebaB9B24BCd5b54DC10
AuditLogger: 0x96EE26fC932cf6d39076347F62E2b0C0c0509399

=== 验证部署 ===
Token Name: Patent Coin
Token Symbol: PATENT
Version: 2.0.0-modular
Max Supply: 1000000000.0