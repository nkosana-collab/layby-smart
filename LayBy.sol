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


        event PaymentRecorded(
        uint256 indexed id,
        address indexed shop,
        address indexed payer,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );

    function pay(uint256 id) external payable {
        LayByRecord storage l = layBys[id];
        require(l.shop != address(0), "Lay-by not found");
        require(msg.sender == l.customer, "Only the customer can pay");
        require(l.status == Status.Active, "Lay-by is not active");
        require(msg.value > 0, "Payment must be above zero");
        require(msg.value <= l.price - l.paid, "Payment exceeds remaining balance");

        l.paid += msg.value;

        emit PaymentRecorded(id, l.shop, msg.sender, msg.value, l.price - l.paid, block.timestamp);

        if (l.paid == l.price) {
            l.status = Status.Completed;
            emit LayByCompleted(id, l.shop, l.customer, l.paid);
        }
    }

    function remainingBalance(uint256 id) external view returns (uint256) {
        require(layBys[id].shop != address(0), "Lay-by not found");
        return layBys[id].price - layBys[id].paid;
    }


    function confirmCollection(uint256 id) external {
        LayByRecord storage l = layBys[id];
        require(l.shop != address(0), "Lay-by not found");
        require(msg.sender == l.customer, "Only the customer can confirm collection");
        require(l.status == Status.Completed, "Lay-by is not completed");

        l.status = Status.Collected;
        uint256 amount = l.paid;

        (bool ok, ) = l.shop.call{value: amount}("");
        require(ok, "Transfer to shop failed");

        emit LayByCollected(id, l.shop, msg.sender, amount);
    }



    event LayByCompleted(
        uint256 indexed id,
        address indexed shop,
        address indexed customer,
        uint256 totalPaid
    );


    event LayByCollected(
        uint256 indexed id,
        address indexed shop,
        address indexed customer,
        uint256 amountReleased
    );
}