// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PatentVesting is Ownable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 cliffDuration;
        bool revocable;
        bool revoked;
    }

    IERC20 public immutable token;
    mapping(address => VestingSchedule) public vestingSchedules;

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration,
        bool revocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");
        require(cliffDuration <= duration, "Cliff > duration");
        require(
            vestingSchedules[beneficiary].totalAmount == 0,
            "Schedule exists"
        );

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            duration: duration,
            cliffDuration: cliffDuration,
            revocable: revocable,
            revoked: false
        });

        require(
            token.transferFrom(msg.sender, address(this), totalAmount),
            "Transfer failed"
        );

        emit VestingScheduleCreated(
            beneficiary,
            totalAmount,
            startTime,
            duration,
            cliffDuration
        );
    }

    function release() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");

        uint256 amount = _releasableAmount(msg.sender);
        require(amount > 0, "No tokens to release");

        schedule.releasedAmount += amount;
        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit TokensReleased(msg.sender, amount);
    }

    function revoke(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.revocable, "Not revocable");
        require(!schedule.revoked, "Already revoked");

        uint256 amount = _releasableAmount(beneficiary);
        if (amount > 0) {
            schedule.releasedAmount += amount;
            require(token.transfer(beneficiary, amount), "Transfer failed");
        }

        uint256 remainingAmount = schedule.totalAmount -
            schedule.releasedAmount;
        if (remainingAmount > 0) {
            require(
                token.transfer(owner(), remainingAmount),
                "Transfer failed"
            );
        }

        schedule.revoked = true;
        emit VestingRevoked(beneficiary);
    }

    function releasableAmount(
        address beneficiary
    ) external view returns (uint256) {
        return _releasableAmount(beneficiary);
    }

    function _releasableAmount(
        address beneficiary
    ) internal view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];

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
