// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PatentDAO is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    mapping(address => uint256) public treasuryBalances;
    address[] public supportedTokens;

    constructor(
        IVotes _token
    )
        Governor("Patent DAO")
        GovernorSettings(1, 50400, 1e18) // 1 block, 1 week, 1 token
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
    {}

    function depositToTreasury(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        treasuryBalances[token] += amount;

        // Add to supported tokens if not already present
        bool exists = false;
        for (uint i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            supportedTokens.push(token);
        }
    }

    function executeTransfer(
        address token,
        address to,
        uint256 amount
    ) external onlyGovernance {
        require(treasuryBalances[token] >= amount, "Insufficient balance");
        treasuryBalances[token] -= amount;
        IERC20(token).transfer(to, amount);
    }

    function getTreasuryBalance(address token) external view returns (uint256) {
        return treasuryBalances[token];
    }

    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokens.length;
    }

    // Override required functions
    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(
        uint256 blockNumber
    )
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }
}
