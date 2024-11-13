//SPDX-License-Identifier: LGPLv3
pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Schnorr {
    // secp256k1 group order
    uint256 public constant Q =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    // parity := public key y-coord parity (27 or 28)
    // px := public key x-coord
    // message := 32-byte message
    // e := schnorr signature challenge
    // s := schnorr signature
    bool verified = false;
    address payable public _recipient;
    address payable public payerAddr;
    bytes32 public payerPublickey;
    bytes32 public payeePublickey;
    uint public blockNumber;

    struct Schorr_par {
        uint8 parity;
        bytes32 px;
        bytes32 message;
        bytes32 e;
        bytes32 s;
        uint8 parity2;
        bytes32 px2;
        bytes32 message2;
        bytes32 e2;
        bytes32 s2;
    }

    constructor(address payable recipient, bytes32 px, bytes32 px2) {
        _recipient = recipient;
        payerPublickey = px;
        payeePublickey = px2;
    }

    function refunding() public {                    // If the deposit is timeout, refund the owner
        if (block.number > blockNumber + 10)
            payable(payerAddr).transfer(address(this).balance);
    }

    function redeemByBob(
        uint8 parity,
        bytes32 px,
        bytes32 message,
        bytes32 e,
        bytes32 s,
        uint8 parity2,
        bytes32 px2,
        bytes32 message2,
        bytes32 e2,
        bytes32 s2
    ) public payable returns (uint8) {
        // ecrecover = (m, v, r, s);
        require(px == payerPublickey);
        bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));
        require(sp != 0);
        // the ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
        address R = ecrecover(sp, parity, px, ep);
        require(R != address(0), "ecrecover failed");
        bool b1 = (e == keccak256(abi.encodePacked(R, uint8(parity), px, message)));
        if (b1 == false) return 0;

        require(px2 == payeePublickey);        
        bytes32 sp2 = bytes32(Q - mulmod(uint256(s2), uint256(px2), Q));
        bytes32 ep2 = bytes32(Q - mulmod(uint256(e2), uint256(px2), Q));
        require(sp2 != 0);
        // the ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
        address R2 = ecrecover(sp2, parity2, px2, ep2);
        require(R2 != address(0), "ecrecover failed");
        bool b2 = (e2 == keccak256(abi.encodePacked(R2, uint8(parity2), px2, message2)));
        if (b2 == false) return 0;
        payable(_recipient).transfer(address(this).balance);  // If two signatures are genuine, transfer
        return 1;
    }

    fallback() external payable {
        if(0 == address(this).balance) {
              payerAddr = payable(msg.sender);
              blockNumber = block.number;
        }
    }
}
