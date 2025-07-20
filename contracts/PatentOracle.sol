// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PatentOracle is Ownable {
    struct PatentData {
        uint256 valuation;
        uint256 lastUpdated;
        bool isActive;
        string ipfsHash;
    }

    mapping(bytes32 => PatentData) public patents;
    mapping(address => bool) public authorizedUpdaters;

    AggregatorV3Interface internal priceFeed;

    event PatentDataUpdated(
        bytes32 indexed patentId,
        uint256 valuation,
        string ipfsHash
    );
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);

    modifier onlyAuthorizedUpdater() {
        require(
            authorizedUpdaters[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function authorizeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
        emit UpdaterAuthorized(updater);
    }

    function revokeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit UpdaterRevoked(updater);
    }

    function updatePatentData(
        bytes32 patentId,
        uint256 valuation,
        string calldata ipfsHash
    ) external onlyAuthorizedUpdater {
        require(valuation > 0, "Invalid valuation");
        require(bytes(ipfsHash).length > 0, "Invalid IPFS hash");

        patents[patentId] = PatentData({
            valuation: valuation,
            lastUpdated: block.timestamp,
            isActive: true,
            ipfsHash: ipfsHash
        });

        emit PatentDataUpdated(patentId, valuation, ipfsHash);
    }

    function getPatentValuation(
        bytes32 patentId
    ) external view returns (uint256) {
        require(patents[patentId].isActive, "Patent not active");
        return patents[patentId].valuation;
    }

    function getPatentData(
        bytes32 patentId
    )
        external
        view
        returns (
            uint256 valuation,
            uint256 lastUpdated,
            bool isActive,
            string memory ipfsHash
        )
    {
        PatentData memory patent = patents[patentId];
        return (
            patent.valuation,
            patent.lastUpdated,
            patent.isActive,
            patent.ipfsHash
        );
    }

    function getLatestPrice() external view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    function deactivatePatent(bytes32 patentId) external onlyOwner {
        patents[patentId].isActive = false;
    }
}
