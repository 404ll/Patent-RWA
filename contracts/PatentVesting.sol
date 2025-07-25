// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PatentVesting
 * @dev 通用代币锁仓合约，支持任意ERC20代币
 */
contract PatentVesting is Ownable, ReentrancyGuard {
    struct VestingSchedule {
        address token; // 代币地址
        uint256 totalAmount; // 总锁仓数量
        uint256 releasedAmount; // 已释放数量
        uint256 startTime; // 开始时间
        uint256 duration; // 锁仓期长度
        uint256 cliffDuration; // cliff期长度
        bool revocable; // 是否可撤销
        bool revoked; // 是否已撤销
    }

    mapping(address => mapping(address => VestingSchedule))
        public vestingSchedules; // beneficiary => token => schedule
    mapping(address => address[]) public beneficiaryTokens; // beneficiary => token addresses

    event VestingScheduleCreated(
        address indexed beneficiary,
        address indexed token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    );
    event TokensReleased(
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );
    event VestingRevoked(address indexed beneficiary, address indexed token);

    function createVestingSchedule(
        address beneficiary,
        address token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration,
        bool revocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(token != address(0), "Invalid token");
        require(totalAmount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");
        require(cliffDuration <= duration, "Cliff > duration");
        require(
            vestingSchedules[beneficiary][token].totalAmount == 0,
            "Schedule exists"
        );

        vestingSchedules[beneficiary][token] = VestingSchedule({
            token: token,
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            duration: duration,
            cliffDuration: cliffDuration,
            revocable: revocable,
            revoked: false
        });

        // 记录受益人的代币列表
        beneficiaryTokens[beneficiary].push(token);

        require(
            IERC20(token).transferFrom(msg.sender, address(this), totalAmount),
            "Transfer failed"
        );

        emit VestingScheduleCreated(
            beneficiary,
            token,
            totalAmount,
            startTime,
            duration,
            cliffDuration
        );
    }

    function release(address token) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender][token];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");

        uint256 amount = _releasableAmount(msg.sender, token);
        require(amount > 0, "No tokens to release");

        schedule.releasedAmount += amount;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");

        emit TokensReleased(msg.sender, token, amount);
    }

    function revoke(address beneficiary, address token) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary][token];
        require(schedule.revocable, "Not revocable");
        require(!schedule.revoked, "Already revoked");

        uint256 amount = _releasableAmount(beneficiary, token);
        if (amount > 0) {
            schedule.releasedAmount += amount;
            require(
                IERC20(token).transfer(beneficiary, amount),
                "Transfer failed"
            );
        }

        uint256 remainingAmount = schedule.totalAmount -
            schedule.releasedAmount;
        if (remainingAmount > 0) {
            require(
                IERC20(token).transfer(owner(), remainingAmount),
                "Transfer failed"
            );
        }

        schedule.revoked = true;
        emit VestingRevoked(beneficiary, token);
    }

    function releasableAmount(
        address beneficiary,
        address token
    ) external view returns (uint256) {
        return _releasableAmount(beneficiary, token);
    }

    function getBeneficiaryTokens(
        address beneficiary
    ) external view returns (address[] memory) {
        return beneficiaryTokens[beneficiary];
    }

    function _releasableAmount(
        address beneficiary,
        address token
    ) internal view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary][token];

        if (
            schedule.revoked ||
            block.timestamp < schedule.startTime + schedule.cliffDuration
        ) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp - schedule.startTime;
        uint256 vestedAmount;

        if (elapsedTime >= schedule.duration) {
            vestedAmount = schedule.totalAmount;
        } else {
            vestedAmount =
                (schedule.totalAmount * elapsedTime) /
                schedule.duration;
        }

        return vestedAmount - schedule.releasedAmount;
    }
}
