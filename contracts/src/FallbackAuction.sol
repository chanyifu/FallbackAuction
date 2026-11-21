// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title FallbackAuction
/// @notice 拍卖履约托管与违约递补协议：出价只收保证金，中标人超时未付款即违约罚没，
///         合约自动按出价从高到低递补下一名；无人承接则流拍退款。
/// @dev 单场上限 maxBidders，递补每次只推一名，避免全榜遍历烧 gas。
contract FallbackAuction {
    enum State {
        OPEN,
        PAYING,
        WON,
        DEFAULTED,
        FALLBACK,
        ABORTED,
        REFUNDED
    }

    struct Bid {
        address bidder;
        uint256 price;
        uint256 deposit;
        bool active;
        bool paid;
    }

    struct AuctionParams {
        address beneficiary;
        string itemUri;
        uint256 startPrice;
        uint256 minIncrement;
        uint256 bidDeadline;   // timestamp
        uint256 payWindow;    // seconds
        uint256 depositBps;   // deposit = price * depositBps / 10000
        uint256 maxBidders;
    }

    AuctionParams public params;
    State public state;
    Bid[] public bids;
    uint256 public winnerIndex;
    uint256 public payDeadline;
    uint256 public beneficiaryCredit;
    bool public withdrawn;

    event BidPlaced(address indexed bidder, uint256 price, uint256 deposit, uint256 rank);
    event Settled(address indexed winner, uint256 price, uint256 payDeadline);
    event Paid(address indexed winner, uint256 remaining, uint256 totalPrice);
    event Defaulted(address indexed bidder, uint256 slashedDeposit);
    event FallbackAdvanced(address indexed nextBidder, uint256 price, uint256 payDeadline);
    event Aborted();
    event Refunded(address indexed bidder, uint256 amount);
    event BeneficiaryWithdrawn(uint256 amount);

    error NotOpen();
    error AuctionEnded();
    error TooManyBidders();
    error PriceTooLow();
    error InvalidDeposit();
    error NotWinner();
    error WrongPayment();
    error DeadlineNotReached();
    error NoBids();
    error NoActiveFallback();
    error NothingToWithdraw();
    error TransferFailed();

    constructor(AuctionParams memory _params) {
        params = _params;
        state = State.OPEN;
        winnerIndex = type(uint256).max;
    }

    // ---------- 出价 ----------

    /// @notice 出价，只托管保证金；同一人可加价补足保证金差额。
    function bid(uint256 price) external payable {
        if (state != State.OPEN) revert NotOpen();
        if (block.timestamp >= params.bidDeadline) revert AuctionEnded();
        if (bids.length >= params.maxBidders) revert TooManyBidders();
        if (price < params.startPrice) revert PriceTooLow();

        uint256 deposit = (price * params.depositBps) / 10000;

        int256 existingIdx = _indexOf(msg.sender);
        if (existingIdx >= 0) {
            uint256 idx = uint256(existingIdx);
            Bid storage b = bids[idx];
            uint256 oldDeposit = b.deposit;
            uint256 depositDelta = deposit > oldDeposit ? deposit - oldDeposit : 0;
            if (msg.value != depositDelta) revert InvalidDeposit();
            // 加价幅度校验：不低于当前最高价 + 最小加价（本人已是最高价时除外）
            _validateRaise(price, idx);
            b.price = price;
            b.deposit = deposit;
            _reSort(idx);
        } else {
            if (msg.value != deposit) revert InvalidDeposit();
            if (bids.length > 0) {
                uint256 top = bids[0].price;
                if (price < top + params.minIncrement) revert PriceTooLow();
            }
            bids.push(Bid({bidder: msg.sender, price: price, deposit: deposit, active: true, paid: false}));
            _reSort(bids.length - 1);
        }

        uint256 rank = _rankOf(msg.sender);
        emit BidPlaced(msg.sender, price, deposit, rank);
    }

    // ---------- 结算 ----------

    /// @notice 出价截止后落槌，最高价进入付款窗口。
    function settle() external {
        if (state != State.OPEN) revert NotOpen();
        if (block.timestamp < params.bidDeadline) revert AuctionEnded();
        if (bids.length == 0) revert NoBids();

        winnerIndex = 0;
        payDeadline = block.timestamp + params.payWindow;
        state = State.PAYING;
        emit Settled(bids[0].bidder, bids[0].price, payDeadline);
    }

    // ---------- 付款 ----------

    /// @notice 中标人付尾款（出价 − 已托管保证金）。
    function pay() external payable {
        if (state != State.PAYING) revert NotOpen();
        Bid storage w = bids[winnerIndex];
        if (msg.sender != w.bidder) revert NotWinner();

        uint256 remaining = w.price - w.deposit;
        if (msg.value != remaining) revert WrongPayment();

        w.paid = true;
        beneficiaryCredit += w.price;
        state = State.WON;
        emit Paid(w.bidder, remaining, w.price);
    }

    // ---------- 违约递补 ----------

    /// @notice 付款窗口已过则当前中标人违约，罚没保证金，推给下一名有效出价人。
    function advanceFallback() external {
        if (state != State.PAYING) revert NotOpen();
        if (block.timestamp <= payDeadline) revert DeadlineNotReached();

        Bid storage defaulter = bids[winnerIndex];
        defaulter.active = false;
        beneficiaryCredit += defaulter.deposit; // 保证金罚没给 beneficiary
        emit Defaulted(defaulter.bidder, defaulter.deposit);

        uint256 next = _nextActive(winnerIndex);
        if (next == type(uint256).max) {
            state = State.ABORTED;
            emit Aborted();
            return;
        }

        winnerIndex = next;
        payDeadline = block.timestamp + params.payWindow;
        state = State.FALLBACK;
        state = State.PAYING;
        emit FallbackAdvanced(bids[next].bidder, bids[next].price, payDeadline);
    }

    /// @notice 候补中标人拒绝递补：全额退保证金，不罚没，直接推给下一名。
    function decline() external {
        if (state != State.PAYING) revert NotOpen();
        Bid storage w = bids[winnerIndex];
        if (msg.sender != w.bidder) revert NotWinner();

        uint256 refundAmt = w.deposit;
        w.active = false;
        w.deposit = 0;
        _transfer(msg.sender, refundAmt);
        emit Refunded(msg.sender, refundAmt);

        uint256 next = _nextActive(winnerIndex);
        if (next == type(uint256).max) {
            state = State.ABORTED;
            emit Aborted();
            return;
        }
        winnerIndex = next;
        payDeadline = block.timestamp + params.payWindow;
        emit FallbackAdvanced(bids[next].bidder, bids[next].price, payDeadline);
    }

    // ---------- 退款 ----------

    /// @notice 未中标者 / 流拍候补退还全额保证金。
    function refund() external {
        int256 idx = _indexOf(msg.sender);
        if (idx < 0) revert NotWinner();
        Bid storage b = bids[uint256(idx)];
        if (!b.active || b.paid) revert NotWinner();
        // 中标位上的人不能退款；已违约者保证金已罚没。
        if (state == State.PAYING || state == State.FALLBACK) {
            if (uint256(idx) == winnerIndex) revert NotWinner();
        }
        uint256 amount = b.deposit;
        b.deposit = 0;
        b.active = false;
        _transfer(msg.sender, amount);
        emit Refunded(msg.sender, amount);
    }

    // ---------- 提款 ----------

    /// @notice 成交后 beneficiary 提取价款与罚没保证金。
    function withdraw() external {
        if (msg.sender != params.beneficiary) revert NotWinner();
        if (beneficiaryCredit == 0) revert NothingToWithdraw();
        uint256 amount = beneficiaryCredit;
        beneficiaryCredit = 0;
        withdrawn = true;
        _transfer(params.beneficiary, amount);
        emit BeneficiaryWithdrawn(amount);
    }

    // ---------- 视图 ----------

    function getBids() external view returns (Bid[] memory) {
        return bids;
    }

    function getWinner() external view returns (address, uint256 price, uint256 deposit) {
        if (winnerIndex == type(uint256).max) return (address(0), 0, 0);
        Bid storage w = bids[winnerIndex];
        return (w.bidder, w.price, w.deposit);
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ---------- 内部 ----------

    function _indexOf(address who) internal view returns (int256) {
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].bidder == who) return int256(i);
        }
        return -1;
    }

    function _rankOf(address who) internal view returns (uint256) {
        int256 idx = _indexOf(who);
        return idx < 0 ? type(uint256).max : uint256(idx);
    }

    function _validateRaise(uint256 price, uint256 selfIdx) internal view {
        for (uint256 i = 0; i < bids.length; i++) {
            if (i == selfIdx) continue;
            if (price < bids[i].price + params.minIncrement) revert PriceTooLow();
        }
    }

    /// @dev 插入/加价后按 price 降序冒泡（maxBidders ≤ 8，开销可控）。
    function _reSort(uint256 idx) internal {
        while (idx > 0 && bids[idx].price > bids[idx - 1].price) {
            Bid memory tmp = bids[idx];
            bids[idx] = bids[idx - 1];
            bids[idx - 1] = tmp;
            idx--;
        }
    }

    function _nextActive(uint256 from) internal view returns (uint256) {
        for (uint256 i = from + 1; i < bids.length; i++) {
            if (bids[i].active) return i;
        }
        return type(uint256).max;
    }

    function _transfer(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
