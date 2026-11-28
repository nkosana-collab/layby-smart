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
    uint16 public constant MAX_FEE_BPS = 100; // 100 basis points = 1% of the full price

    uint256 public immutable graceSeconds;

    constructor(uint256 graceSeconds_) {
        graceSeconds = graceSeconds_;
    }

    mapping(uint256 => LayByRecord) private layBys;
    mapping(address => uint256[]) private customerLayBys;
    mapping(address => uint256[]) private shopLayBys;

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
        require(completionDate > block.timestamp, "Completion date must be in the future");
        require(feeBps <= MAX_FEE_BPS, "Fee exceeds 1% of price");

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

        customerLayBys[customer].push(id);
        shopLayBys[msg.sender].push(id);


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
        require(block.timestamp < expiryTime(id), "Lay-by has expired");
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


    function layBysOfCustomer(address customer) external view returns (uint256[] memory) {
        return customerLayBys[customer];
    }

    function layBysOfShop(address shop) external view returns (uint256[] memory) {
        return shopLayBys[shop];
    }



    function feeIfCancelled(uint256 id) public view returns (uint256) {
        LayByRecord storage l = layBys[id];
        require(l.shop != address(0), "Lay-by not found");
        uint256 fee = (l.price * l.feeBps) / 10000;
        return fee > l.paid ? l.paid : fee;
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


    function cancel(uint256 id) external {
        LayByRecord storage l = layBys[id];
        require(l.shop != address(0), "Lay-by not found");

        uint256 fee;
        if (msg.sender == l.customer) {
            require(l.status == Status.Active, "Customer can only cancel an active lay-by");
            fee = feeIfCancelled(id);
        } else if (msg.sender == l.shop) {
            require(
                l.status == Status.Active || l.status == Status.Completed,
                "Lay-by cannot be cancelled"
            );
            fee = 0; // shop cancels: full refund, no fee
        } else {
            revert("Only the customer or shop can cancel");
        }

        uint256 paid = l.paid;
        uint256 refund = paid - fee;
        l.status = Status.Cancelled; // state first, money second

        if (fee > 0) {
            (bool okFee, ) = l.shop.call{value: fee}("");
            require(okFee, "Fee transfer failed");
        }
        if (refund > 0) {
            (bool okRefund, ) = l.customer.call{value: refund}("");
            require(okRefund, "Refund transfer failed");
        }

        emit LayByCancelled(id, msg.sender, paid, fee, refund);
    }



    function expiryTime(uint256 id) public view returns (uint256) {
        require(layBys[id].shop != address(0), "Lay-by not found");
        return uint256(layBys[id].completionDate) + graceSeconds;
    }

    function expire(uint256 id) external {
        LayByRecord storage l = layBys[id];
        require(l.shop != address(0), "Lay-by not found");
        require(msg.sender == l.shop, "Only the shop can expire a lay-by");
        require(l.status == Status.Active, "Lay-by is not active");
        require(block.timestamp >= expiryTime(id), "Expiry time not reached");

        uint256 paid = l.paid;
        uint256 fee = feeIfCancelled(id);
        uint256 refund = paid - fee;
        l.status = Status.Expired; // state first, money second

        if (fee > 0) {
            (bool okFee, ) = l.shop.call{value: fee}("");
            require(okFee, "Fee transfer failed");
        }
        if (refund > 0) {
            (bool okRefund, ) = l.customer.call{value: refund}("");
            require(okRefund, "Refund transfer failed");
        }

        emit LayByExpired(id, l.shop, paid, fee, refund);
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


    event LayByCancelled(
        uint256 indexed id,
        address indexed cancelledBy,
        uint256 amountPaid,
        uint256 fee,
        uint256 refund
    );


    event LayByExpired(
        uint256 indexed id,
        address indexed shop,
        uint256 amountPaid,
        uint256 fee,
        uint256 refund
    );
}