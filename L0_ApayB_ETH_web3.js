// send-web3-ethers-rotation.js
// ：npm install web3 ethers
//  `npx hardhat node --hostname 127.0.0.1`

let Web3;
try {
    ({ Web3 } = require("web3"));   // web3 v4
} catch (e) {
    Web3 = require("web3");         // web3 v1
}
const { ethers } = require("ethers"); 
const { expect } = require("chai");

const hre = require("hardhat");
const secp256k1 = require('secp256k1');
const { readFileSync } = require('fs');

async function main() {
    // ---------- 0. Connect to Hardhat ----------
    const web3 = new Web3("http://127.0.0.1:8545");

    const AlicePrivKey =  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat #0
    const AliceAccount = web3.eth.accounts.privateKeyToAccount(AlicePrivKey);
    const from = AliceAccount.address;
 
    const BobPrivKey =  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Hardhat #0
    const BobAccount = web3.eth.accounts.privateKeyToAccount(BobPrivKey);
    const to = BobAccount.address;  // Hardhat #1

    const nonce = await web3.eth.getTransactionCount(from, "latest");
    const chainId = Number(await web3.eth.getChainId());
    console.log("from:   ", from);
    console.log("to:     ", to);


    // ---------- 1. Construct Tx（web3.js） ----------
    const tx = {
        from,
        to,
        value: web3.utils.toWei("12.15", "ether"),   //"Alice Pays Bob 0.45*27 = 12.15 ETH" 
        nonce,
        gasPrice: web3.utils.toWei("10", "gwei"),
        gasLimit: 21000,
        chainId,
        data: "0x",
    };

    const signed = await web3.eth.accounts.signTransaction(tx, AlicePrivKey);
    const rawTx = signed.rawTransaction;
    const parsed = ethers.Transaction.from(rawTx);
    const unsignedTx_sent = parsed.unsignedSerialized;
    const sigA0_r_sent = parsed.signature.r;
    const sigA0_v_sent = parsed.signature.v;

// ------------- 2. Reading Alice's signature sigA1 in ledger L1 ------------------ 
    const sigA1Hex = readFileSync('sigA1.dat', 'utf8').trim();
    const sigA1_r = Buffer.from(sigA1Hex.slice(0, 64), 'hex');
    const sigA1_s = Buffer.from(sigA1Hex.slice(64, 128), 'hex');
    const sigA1_v = Buffer.from(sigA1Hex.slice(128, 130), 'hex');

     
  // --------------- 3. Signature tie: Alice generates and Bob recovers Alice's sig---------------- 
  var tie_tau = secp256k1.privateKeyTweakAdd(Buffer.from(ethers.getBytes(parsed.signature.s)), sigA1_s);  //Omit the proof

// ---------- 4. The unsigned tx and tie are delivered to Bob off-chain. Afterwards, Bob recovers sigAs -------------------
    const sigAs = secp256k1.privateKeyTweakAdd(tie_tau, secp256k1.privateKeyNegate(sigA1_s));
    const newSignature = ethers.Signature.from({ r: sigA0_r_sent,  s: ethers.hexlify(sigAs),       v: sigA0_v_sent });

    const restoredObj = ethers.Transaction.from(unsignedTx_sent);
    restoredObj.signature = newSignature; 
    const restoredRaw = restoredObj.serialized;

    if (restoredRaw !== rawTx) {
        throw new Error("❌ rawTx is incorrect！");
    }
    console.log("④ Passed：restoredRaw === rawTx\n");

    // ---------- 5. Broadcsat（web3.js） ----------
    const receipt = await web3.eth.sendSignedTransaction(restoredRaw);
    console.log("   Block No:", String(receipt.blockNumber));
    console.log("   from:", receipt.from, "-> to:", receipt.to);
    console.log("   status:", String(receipt.status) === "1" || receipt.status === 1n ? "Success" : "Failure");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});