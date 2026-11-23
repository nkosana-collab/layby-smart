// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LayBy {
    enum Status { Active, Completed, Collected, Cancelled, Expired }

    struct LayByRecord {
        address shop;
        address customer;
        string item;
        uint256 price;
        uint256 paid;
        uint64 completionDate;
        uint16 feeBps;
        Status status;
    }

    uint256 public nextId = 1;
    mapping(uint256 => LayByRecord) private layBys;

    event LayByCreated(
        uint256 indexed id,
        address indexed shop,
        address indexed customer,
        string item,
        uint256 price,
        uint64 completionDate,
        uint16 feeBps
    );

    function createLayBy(
        address customer,
        string calldata item,
        uint256 price,
        uint64 completionDate,
        uint16 feeBps
    ) external returns (uint256 id) {
        require(price > 0, "Price must be above zero");
        require(customer != address(0) && customer != msg.sender, "Invalid customer");

        id = nextId++;
        layBys[id] = LayByRecord({
            shop: msg.sender,
            customer: customer,
            item: item,
            price: price,
            paid: 0,
            completionDate: completionDate,
            feeBps: feeBps,
            status: Status.Active
        });

        emit LayByCreated(id, msg.sender, customer, item, price, completionDate, feeBps);
    }

    function getLayBy(uint256 id) external view returns (LayByRecord memory) {
        require(layBys[id].shop != address(0), "Lay-by not found");
        return layBys[id];
    }
}