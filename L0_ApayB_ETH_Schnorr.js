const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigInteger = require('bigi')
const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')
let { Web3 } = require("web3");

const arrayify = ethers.utils.arrayify;

// need to start: PS==> npx hardhat node
let provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
let web3 = new Web3(provider);


function sign(m, x) {
    var publicKey = secp256k1.publicKeyCreate(x);

    // R = G * k
    var k = randomBytes(32);
    var R = secp256k1.publicKeyCreate(k);

    // e = h(address(R) || compressed pubkey || m)
    var e = challenge(R, m, publicKey);

    // xe = x * e
    var xx = x;
    var xe = secp256k1.privateKeyTweakMul(xx, e);

    // s = k + xe
    var s = secp256k1.privateKeyTweakAdd(k, xe);
    return { R, s, e };
}

function challenge(R, m, publicKey) {
    // convert R to address
    // see https://github.com/ethereum/go-ethereum/blob/eb948962704397bb861fd4c0591b5056456edd4d/crypto/crypto.go#L275
    var R_uncomp = secp256k1.publicKeyConvert(R, false);
    var R_addr = arrayify(ethers.utils.keccak256(R_uncomp.slice(1, 65))).slice(12, 32);

    // e = keccak256(address(R) || compressed publicKey || m)
    var e = arrayify(ethers.utils.solidityKeccak256(
        ["address", "uint8", "bytes32", "bytes32"],
        [R_addr, publicKey[0] + 27 - 2, publicKey.slice(1, 33), m]));

    return e;
}

async function check() {

    // -------------- 0. Initialization for key pairs and smart contract ------------------
    let privKeyA0 = Buffer.from('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'hex');
    var accountA0 = web3.eth.accounts.privateKeyToAccount(privKeyA0);
    if (!secp256k1.privateKeyVerify(privKeyA0)) console.log("wrong privKeyA0");
    var publicKeyA0 = secp256k1.publicKeyCreate(privKeyA0);

    let privKeyB0 = Buffer.from('59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', 'hex');
    var accountB0 = web3.eth.accounts.privateKeyToAccount(privKeyB0);
    if (!secp256k1.privateKeyVerify(privKeyB0)) console.log("wrong privKeyB0");
    var publicKeyB0 = secp256k1.publicKeyCreate(privKeyB0);

    const Schnorr = await ethers.getContractFactory("Schnorr");
    const schnorr = await Schnorr.deploy(accountB0.address, publicKeyA0.slice(1, 33), publicKeyB0.slice(1, 33));
    await schnorr.deployed();

    // -------------- 1. Forming Message: "Alice Pays Bob 0.45*27 ETH" ------------------    
    amount = BigInt(1.0e18 * 0.45 * 27);  // 1 BTC = 27 ETH on 31 Oct. 2024
    msgSigned = accountA0.address;
    msgSigned = msgSigned.concat(" ", accountB0.address, " ", amount.toString()) // Bob pays Alice
    var m0 = ethers.utils.keccak256(Buffer.from(msgSigned.toString('Hex')));

    // ------------- 2. Alice's signature sigA1 (DER-encoded) in ledger L1 ------------------ 
    var DERsigA1 = '304402204ebc3464cda0c2215296a5165eaa5d9066b65db85fe656d482dc59d06187010102203f772c25cd6ab1f2685dd82e74649d4a798875c88401107541080949a1e8b5e4';
    // COnvert DERsigA1 to (r,s) <=== https://lapo.it/asn1js/#MEQCIE68NGTNoMIhUpalFl6qXZBmtl24X-ZW1ILcWdBhhwEBAiA_dywlzWqx8mhd2C50ZJ1KeYh1yIQBEHVBCAlJoei15A
    var DERsigA1_r = Buffer.from('172A3FF4296861D438E4F1E509C48AB9CD5C625BD113B27039578E1576628D81', 'hex');
    var DERsigA1_s = Buffer.from('72F417E80AC2E31387E45488000321423F1CAFD016EA00754BD13A9C5BD9986A', 'hex');

    // --------------- 3. Signature tie: Alice generates and discloses the tie_tau---------------- 
    var sigA0 = sign(m0, privKeyA0);
    var tie_tau = secp256k1.privateKeyTweakAdd(sigA0.s, DERsigA1_s);

    //-------------- 4. Alice deposits  0.45*27 ETH to contract ------------------
    const AliceBeforeTx = await ethers.provider.getBalance(accountA0.address);
    const signer = ethers.provider.getSigner(accountA0.address)// Alice address
    await signer.sendTransaction({
        to: schnorr.address,
        value: amount
    });
    const AliceAfterTx = await ethers.provider.getBalance(accountA0.address);
    console.log("Alice paid: ", AliceBeforeTx - AliceAfterTx)
    contract_Balance = await ethers.provider.getBalance(schnorr.address);
    console.log("contract balance after depositing:", BigInt(contract_Balance))

    // -------------- 5. Bob discloses his signature SigB1 such that Alice broadcasts transaction Tx1 in ledger L1 ----------

    // -------------- 6. Signature untie: Bob recovers Alice signature sigA0 from transaction Tx1---------------    
    sigA0s_recovered = secp256k1.privateKeyTweakAdd(tie_tau, secp256k1.privateKeyNegate(DERsigA1_s));

    // -------------- 7. Bob sends the redeem transaction Tx0 by calling smart contract---------------    
    var sigB0 = sign(m0, privKeyB0);
    let gasA1 = await schnorr.estimateGas.redeemByBob(
        publicKeyA0[0] - 2 + 27,
        publicKeyA0.slice(1, 33),
        arrayify(m0),
        sigA0.e,
        sigA0s_recovered,
        publicKeyB0[0] - 2 + 27,
        publicKeyB0.slice(1, 33),
        arrayify(m0),
        sigB0.e,
        sigB0.s
    )

    const BobBeforeTx = await ethers.provider.getBalance(accountB0.address);
    const startTxTime = Date.now();

    let ret = await schnorr.redeemByBob(
        publicKeyA0[0] - 2 + 27,     // Alice's signature
        publicKeyA0.slice(1, 33),
        arrayify(m0),
        sigA0.e,
        sigA0s_recovered,
        publicKeyB0[0] - 2 + 27,    // Bob's signature
        publicKeyB0.slice(1, 33),
        arrayify(m0),
        sigB0.e,
        sigB0.s
    )

    // -------------- 8. Transaction summary ---------------        
    const BobAfterTx = await ethers.provider.getBalance(accountB0.address);
    endTxTime = Date.now();
    console.log("Bob redeived: ", BigInt(BobAfterTx) - BigInt(BobBeforeTx),
        ", time cost = ", endTxTime - startTxTime, "ms,", "gas cost:", BigInt(gasA1));

    contract_Balance = await ethers.provider.getBalance(schnorr.address);
    console.log("contract balance after redeeming:", BigInt(contract_Balance))
}

const main = () => {
    check();
};


main();
