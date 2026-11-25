// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILayBy {
    function createLayBy(
        address customer,
        string calldata item,
        uint256 price,
        uint64 completionDate,
        uint16 feeBps
    ) external returns (uint256);
    function cancel(uint256 id) external;
}

contract ReentrancyShop {
    ILayBy public target;
    uint256 public targetId;
    bool public reenterEnabled;
    bool public rejectPayments;
    bool public attackSucceeded;
    bool public attackBlocked;

    constructor(address layBy) {
        target = ILayBy(layBy);
    }

    function create(address customer, uint256 price, uint64 completionDate, uint16 feeBps) external {
        targetId = target.createLayBy(customer, "Attack TV", price, completionDate, feeBps);
    }

    function setReenter(bool on) external { reenterEnabled = on; }
    function setReject(bool on) external { rejectPayments = on; }

    receive() external payable {
        require(!rejectPayments, "Shop rejects payments");
        if (reenterEnabled) {
            reenterEnabled = false; // one attempt only
            try target.cancel(targetId) {
                attackSucceeded = true;
            } catch {
                attackBlocked = true;
            }
        }
    }
}