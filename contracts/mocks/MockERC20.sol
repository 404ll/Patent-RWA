// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev 用于测试的简单 ERC20 代币精度为6位小数
 */
contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        address initialAccount,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(initialAccount, initialSupply);
    }
}

