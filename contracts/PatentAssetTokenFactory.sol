// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PatentAssetToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PatentAssetTokenFactory
 * @dev 专利资产代币工厂合约，用于批量创建专利代币
 */
contract PatentAssetTokenFactory is Ownable {
    address public immutable metadataRegistry;
    address[] public deployedTokens;

    mapping(string => address) public patentNumberToToken;

    event PatentTokenCreated(
        address indexed tokenAddress,
        string patentNumber,
        string name,
        string symbol,
        uint256 valuation
    );

    constructor(address _metadataRegistry) {
        metadataRegistry = _metadataRegistry;
    }

    function createPatentToken(
        string memory name,
        string memory symbol,
        string memory patentNumber,
        string memory title,
        uint256 valuationUSD,
        uint256 tokenizedAmount,
        address revenueToken
    ) external onlyOwner returns (address) {
        require(
            patentNumberToToken[patentNumber] == address(0),
            "Patent already tokenized"
        );

        PatentAssetToken newToken = new PatentAssetToken(
            name,
            symbol,
            patentNumber,
            title,
            valuationUSD,
            tokenizedAmount,
            metadataRegistry,
            revenueToken
        );

        address tokenAddress = address(newToken);
        deployedTokens.push(tokenAddress);
        patentNumberToToken[patentNumber] = tokenAddress;

        // 转移所有权给调用者
        newToken.transferOwnership(msg.sender);

        emit PatentTokenCreated(
            tokenAddress,
            patentNumber,
            name,
            symbol,
            valuationUSD
        );

        return tokenAddress;
    }

    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }

    function getTokenByPatentNumber(
        string memory patentNumber
    ) external view returns (address) {
        return patentNumberToToken[patentNumber];
    }
}
