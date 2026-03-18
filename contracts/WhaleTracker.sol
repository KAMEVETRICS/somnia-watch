// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/*//////////////////////////////////////////////////////////////
//                                                            //
//    ██╗    ██╗██╗  ██╗ █████╗ ██╗     ███████╗              //
//    ██║    ██║██║  ██║██╔══██╗██║     ██╔════╝              //
//    ██║ █╗ ██║███████║███████║██║     █████╗                //
//    ██║███╗██║██╔══██║██╔══██║██║     ██╔══╝                //
//    ╚███╔███╔╝██║  ██║██║  ██║███████╗███████╗              //
//     ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝            //
//              ████████╗██████╗  █████╗  ██████╗██╗  ██╗     //
//              ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝     //
//                 ██║   ██████╔╝███████║██║     █████╔╝      //
//                 ██║   ██╔══██╗██╔══██║██║     ██╔═██╗      //
//                 ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗     //
//                 ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   //
//                                                            //
//   Somnia Reactivity Mini Hackathon — WhaleTracker v1.0     //
//   On-chain push-model whale transfer detection             //
//                                                            //
//////////////////////////////////////////////////////////////*/

import {SomniaEventHandler} from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

/// @notice Minimal ERC-20 interface — only what we need to query totalSupply()
interface IERC20Minimal {
    function totalSupply() external view returns (uint256);
}

/// @title  WhaleTracker — Reactive Whale Transfer Detector for Somnia
/// @author Somnia Reactivity Mini Hackathon Entry
/// @notice Subscribes to ERC-20 Transfer events via Somnia's push-model reactivity.
///         When a transfer exceeds the configured "whale" threshold for a tracked token,
///         the contract emits a WhaleAlert event — fully on-chain, zero off-chain infra.
/// @dev    Inherits SomniaEventHandler so Somnia validators invoke `_onEvent()` atomically
///         whenever a subscribed Transfer event is emitted on-chain.
contract WhaleTracker is SomniaEventHandler {

    // ──────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Emitted when a whale-sized transfer is detected.
    /// @param token  The ERC-20 token contract address
    /// @param from   Sender of the transfer
    /// @param to     Recipient of the transfer
    /// @param amount Raw token amount transferred (in token's native decimals)
    event WhaleAlert(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    // ──────────────────────────────────────────────────────────────────────
    //  CONSTANTS — Transfer event signature & Somnia Testnet token addresses
    // ──────────────────────────────────────────────────────────────────────

    /// @dev keccak256("Transfer(address,address,uint256)")
    ///      Used to verify incoming events are ERC-20 Transfer events.
    bytes32 private constant TRANSFER_EVENT_SIG =
        0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef;

    // ─── Somnia Testnet Token Addresses (Shannon) ────────────────────────
    address public constant SUSDT = 0x65296738D4E5edB1515e40287B6FDf8320E6eE04;
    address public constant USDC  = 0x0ED782B8079529f7385c3eDA9fAf1EaA0DbC6a17;
    address public constant STT   = 0x7f89af8b3c0A68F536Ff20433927F4573CF001A3;
    address public constant WSTT  = 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7;
    address public constant WETH  = 0xdd8f41bf80d0E47132423339ca06bC6413da96b5;
    address public constant PING  = 0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493;
    address public constant PONG  = 0x9beaA0016c22B646Ac311Ab171270B0ECf23098F;
    address public constant NIA   = 0xF2F773753cEbEFaF9b68b841d80C083b18C69311;

    // ──────────────────────────────────────────────────────────────────────
    //  STATE — Token tracking & thresholds
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Owner of the contract (deployer), used for admin functions
    address public immutable owner;

    /// @notice Number of tracked tokens (set once in constructor)
    uint8 public immutable trackedTokenCount;

    /// @notice Maps token address → minimum transfer amount to trigger WhaleAlert.
    ///         A zero threshold means the token is not tracked.
    mapping(address => uint256) public whaleThreshold;

    /// @notice Array of all tracked token addresses (for enumeration / off-chain reads)
    address[] public trackedTokens;

    /// @notice Running counter of total whale alerts emitted
    uint256 public totalWhaleAlerts;

    // ──────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Deploys the WhaleTracker and sets all token thresholds.
    /// @dev    Token addresses are hardcoded as constants for Somnia Testnet (Shannon).
    ///         For ecosystem tokens (PING, PONG, NIA), the constructor queries
    ///         each token's totalSupply() and caches 0.2% as the static threshold.
    ///         This avoids a costly external call on every reactive invocation.
    constructor() {
        owner = msg.sender;

        // ─── Category 1: Stablecoins ────────────────────────────────
        // Threshold: > 100 tokens
        // sUSDT & USDC both use 6 decimals (standard for USD stables)
        // 100 tokens = 100 * 1e6 = 100_000_000
        // We store the threshold as the exact boundary: transfers must be
        // strictly GREATER than this value.
        _setThreshold(SUSDT, 100 * 1e6);     // > 100 sUSDT  (6 decimals)
        _setThreshold(USDC,  100 * 1e6);     // > 100 USDC   (6 decimals)

        // ─── Category 2: Native & Wrapped Majors ─────────────────────
        // STT threshold:  > 50 tokens  (18 decimals) = 50 * 1e18
        // WSTT threshold: > 50 tokens  (18 decimals) = 50 * 1e18
        // WETH threshold: > 0.5 tokens (18 decimals) = 5e17
        _setThreshold(STT,  50 * 1e18);      // > 50 STT     (18 decimals)
        _setThreshold(WSTT, 50 * 1e18);      // > 50 WSTT    (18 decimals)
        _setThreshold(WETH, 5e17);            // > 0.5 WETH   (18 decimals)

        // ─── Category 3: Ecosystem Tokens ───────────────────────────
        // Threshold: > 0.2% of totalSupply, computed ONCE at deploy time.
        // Formula: totalSupply * 2 / 1000  (equivalent to 0.2%)
        // Using * 2 / 1000 to avoid precision loss from integer division.
        _setDynamicThreshold(PING);
        _setDynamicThreshold(PONG);
        _setDynamicThreshold(NIA);

        trackedTokenCount = uint8(trackedTokens.length); // Always 8
    }

    // ──────────────────────────────────────────────────────────────────────
    //  INTERNAL — Threshold helpers
    // ──────────────────────────────────────────────────────────────────────

    /// @dev Stores a fixed threshold for a token and registers it in the tracked list.
    function _setThreshold(address _token, uint256 _threshold) internal {
        require(_token != address(0), "WhaleTracker: zero address");
        whaleThreshold[_token] = _threshold;
        trackedTokens.push(_token);
    }

    /// @dev Queries totalSupply() at deploy time, calculates 0.2%, and stores it.
    ///      Reverts if the token is unreachable or has zero supply.
    function _setDynamicThreshold(address _token) internal {
        require(_token != address(0), "WhaleTracker: zero address");
        uint256 supply = IERC20Minimal(_token).totalSupply();
        require(supply > 0, "WhaleTracker: zero supply");
        // 0.2% = supply * 2 / 1000
        uint256 threshold = (supply * 2) / 1000;
        whaleThreshold[_token] = threshold;
        trackedTokens.push(_token);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  CORE — Somnia Reactivity Callback
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Called automatically by Somnia validators when a subscribed event fires.
    /// @dev    This is the push-model entry point. The network guarantees:
    ///         - `emitter` is the contract that emitted the log
    ///         - `eventTopics` contains the indexed event parameters (topic0 = sig)
    ///         - `data` contains the ABI-encoded non-indexed parameters
    ///
    ///         For ERC-20 Transfer(address indexed from, address indexed to, uint256 value):
    ///           eventTopics[0] = keccak256("Transfer(address,address,uint256)")
    ///           eventTopics[1] = bytes32(uint256(uint160(from)))
    ///           eventTopics[2] = bytes32(uint256(uint160(to)))
    ///           data           = abi.encode(value)
    ///
    /// @param emitter      Address of the ERC-20 contract that emitted the Transfer event
    /// @param eventTopics  Array of event topics: [sig, from, to]
    /// @param data         ABI-encoded transfer amount (uint256)
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // ─── Guard: ensure this is a Transfer event with correct topic count ──
        // ERC-20 Transfer has exactly 3 topics: signature + 2 indexed params
        if (eventTopics.length != 3) return;
        if (eventTopics[0] != TRANSFER_EVENT_SIG) return;

        // ─── Guard: ensure this token is tracked ─────────────────────────────
        uint256 threshold = whaleThreshold[emitter];
        if (threshold == 0) return; // Not a tracked token — skip silently

        // ─── Decode the transfer amount from the non-indexed data ────────────
        // data is ABI-encoded uint256 (32 bytes). We use abi.decode for safety.
        uint256 amount = abi.decode(data, (uint256));

        // ─── Check whale threshold (strictly greater than) ───────────────────
        if (amount <= threshold) return;

        // ─── Extract from/to addresses from indexed topics ───────────────────
        // Topics are left-padded bytes32; the address occupies the lower 20 bytes.
        address from = address(uint160(uint256(eventTopics[1])));
        address to   = address(uint160(uint256(eventTopics[2])));

        // ─── Increment counter & emit whale alert ────────────────────────────
        unchecked {
            ++totalWhaleAlerts;
        }

        emit WhaleAlert(emitter, from, to, amount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS — For frontend / off-chain reads
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Returns all tracked token addresses
    function getTrackedTokens() external view returns (address[] memory) {
        return trackedTokens;
    }

    /// @notice Checks if a given token is currently tracked
    /// @param _token The token address to check
    /// @return True if the token has a non-zero whale threshold
    function isTracked(address _token) external view returns (bool) {
        return whaleThreshold[_token] > 0;
    }

    /// @notice Returns the whale threshold for a specific token
    /// @param _token The token address to query
    /// @return Minimum transfer amount (in raw token decimals) to trigger a WhaleAlert
    function getThreshold(address _token) external view returns (uint256) {
        return whaleThreshold[_token];
    }

    // ──────────────────────────────────────────────────────────────────────
    //  ADMIN — Owner-only management
    // ──────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "WhaleTracker: not owner");
        _;
    }

    /// @notice Allows the owner to update a token's whale threshold post-deployment
    /// @dev    Useful if ecosystem token supply changes significantly, or to add
    ///         new tokens without redeploying the entire contract.
    /// @param _token     The token address
    /// @param _threshold The new whale threshold (in raw token decimals)
    function updateThreshold(address _token, uint256 _threshold) external onlyOwner {
        require(_token != address(0), "WhaleTracker: zero address");

        // If this is a brand-new token, add it to the tracked list
        if (whaleThreshold[_token] == 0) {
            trackedTokens.push(_token);
        }

        whaleThreshold[_token] = _threshold;
    }

    /// @notice Removes a token from whale tracking
    /// @dev    Sets threshold to 0 so _onEvent skips it. Does NOT remove from
    ///         the trackedTokens array to avoid expensive array shifts on-chain.
    ///         Use getTrackedTokens() + isTracked() off-chain for the active set.
    /// @param _token The token address to stop tracking
    function removeToken(address _token) external onlyOwner {
        whaleThreshold[_token] = 0;
    }
}
