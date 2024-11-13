// 1.	Installation
// •	bitcoin-28.0-win64-setup, https://bitcoincore.org/en/download/
// •	bitcoinjs-lib-master。https://github.com/bitcoinjs/bitcoinjs-lib
// •	MS VScode https://visualstudio.microsoft.com/zh-hans/downloads/
// •	Node.js  https://nodejs.org/en/download/package-manager
// •	Our code AtomicAsseteXchange.js
// 2.	In command line of OS, run
//        bitcoin-qt -regtest -addresstype="legacy" -changetype="legacy" -fallbackfee=0.001
// 3.	With the menu of bitcoin-qt, Create 2 wallets with names “AliceWallet1”, and “BobWallet1”
// 4.	In the command line of bitcoin-qt, create an address for each wallet with command getnewaddress as “AliceAddress1”, and “BobAddress1” 
// 5.	Select wallet “AliceWallet1”, in the command line of bitcoin-qt, run  generatetoaddress 1 “AliceAddress1”
// 6.	Select wallet “BobWallet1”, In the command line of bitcoin-qt, run >  generatetoaddress 101 “BobAddress1”
// 7.	compile this.js with VScode, generate the 1st raw-transaction, run the output of line 93, and replace variable previousTxHex_Bob (line 40) and txIndex_Bob (line 43)
// 8.	compile the revised this.js, generate the 2nd raw-transaction, run the output of line 74, and replace variable previousTxHex_Alice (line 34) and txIndex_Bob (line 37)
// 9.	compile the doubly-revised this.js, generate the 3rd raw-transaction, broadcast the output of line 116

const { signECDSA } = require('@scure/btc-signer/utils');
const bitcoin = require('bitcoinjs-lib');
const network = bitcoin.networks.regtest;

ECPairFactory = require('ecpair').default;
ecc = require('tiny-secp256k1');
const base58check = require('base58check');  //npm i --save base58check
ECPair = ECPairFactory(ecc);
const hashtype = bitcoin.Transaction.SIGHASH_ALL;

const ONE = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex',);
const keyPairAlice = ECPair.fromPrivateKey(ONE,  { network });
const TWO = Buffer.from('0000000000000000000000000000000000000000000000000000000000000002', 'hex',);
const keyPairBob = ECPair.fromPrivateKey(TWO,  { network });

// 1. Update previousTxHex_Bob and txIndex_Bob after running the command inside line 93
const previousTxHex_Bob = '020000000001019b2a5065fecf9ff1cc3576be86d1c121a19b2ff681e5be974de96470927b2c660000000000fdffffff0200a54a1f000000001976a914c337652b315feb1cdd432a2698cfe5c923014e0588ac00e1f5050000000016001406afd46bcdfd22ef94ac122aa11f241244a37ecc0247304402206a61b419b5f2ec262ae3e0ae13dfd6beb764031e79e9a0e5eb1377c9686d97f502203961ae2b010cab1dceeebbc5c8e298b9c329904e533c247b120ff316e959a24401210302617e109fe908a877e74c59f364ab0718fe0861c6832fe17da1098626deb5b000000000';
txIndex_Bob = 1; 
const utxo_Bob = bitcoin.Transaction.fromHex(previousTxHex_Bob);
const txid_Bob = utxo_Bob.getId();

// 2. Update previousTxHex_Alice and txIndex_Alice after running the command inside line 74
const previousTxHex_Alice = '020000000001014fd909f14a4c5886c6d450a38becce4b7d96549e8b4b01b6486bfd40e1d7685b0000000000fdffffff028c5e4025000000001976a914afb52a6812e0df54ea24b4f582d46b14366869c088ac102700000000000017a914e58c9fab968545e1397ff57663909f373263266d870247304402201f77831b567a2726d4981638baebd3839c03bb91a1c0969dcf47b9c1cbd68c46022023ebac1e659b4eb1b7a3b7d7a7cd952d9fa2a1efcfc4d2a5e899e189642a349501210302617e109fe908a877e74c59f364ab0718fe0861c6832fe17da1098626deb5b000000000';
txIndex_Alice = 1;  
const utxo_Alice = bitcoin.Transaction.fromHex(previousTxHex_Alice);
const txid_Alice = utxo_Alice.getId();

const amount_Alice = utxo_Alice.outs[txIndex_Alice].value;
const amount_Bob = utxo_Bob.outs[txIndex_Bob].value;
const amount = amount_Bob //amount_Alice - 10000;
console.log('amount: ', amount);

const tx = new bitcoin.Transaction(network);

// scriPubKey
const payeeScriptAsm1 = "OP_DUP OP_HASH160 2408e8329ae410b4d82c8d104f832cd53666e5d9 OP_EQUALVERIFY OP_CHECKSIG";
const payeeScript1 = bitcoin.script.fromASM(payeeScriptAsm1); //Send to Alice's address: 2408e8329ae410b4d82c8d104f832cd53666e5d9

//  =============== Preparation from the Payee Alice ===============================
x0=(Buffer.from(keyPairBob.publicKey)).toString('hex');
x1 = (Buffer.from(keyPairAlice.publicKey)).toString('hex');
str= x0.concat(' ',  txid_Bob, txIndex_Bob.toString(), x0,  x1, amount.toString(), hashtype.toString(), Buffer.from(payeeScript1).toString('hex')) // Bob pays Alice

hashOut = bitcoin.crypto.hash160(str);
console.log('hashOut:', Buffer.from(hashOut, 'Hex').toString('hex'));

sig0 = signECDSA(hashOut, keyPairAlice.privateKey);
console.log('sig0:', Buffer.from(sig0, 'Hex').toString('hex'));

// =============== input 0 (ScriptPubKey) from the Payee Alice ===============================
signature0Hash = bitcoin.crypto.hash160(sig0);
locking_script_Alice = bitcoin.script.compile([    //locking script of Alice
    bitcoin.opcodes.OP_HASH160,
    signature0Hash,
    bitcoin.opcodes.OP_EQUALVERIFY,
    bitcoin.opcodes.OP_1,
]);

//Complete the script of the previousTx, and deploy it
p2sh = bitcoin.payments.p2sh({redeem: {output: locking_script_Alice, network}, network})
console.log('Alice runs: bitcoin_cli sendtoaddress  '+ "'"+ p2sh.address + "' 0.0001"); // Alice's bond 0.

tx.addInput(Buffer.from(txid_Alice, 'hex').reverse(), txIndex_Alice);

// =============== input 1 (ScriptPubKey) from Bob ===============================
tx.addInput(Buffer.from(txid_Bob, 'hex').reverse(), txIndex_Bob);

const { address } = bitcoin.payments.p2pkh({ pubkey: keyPairBob.publicKey })
var PayeeBobAddr = base58check.decode(address, 'hex')
console.log('pubkeyhash:', Buffer.from(PayeeBobAddr.data, 'Hex').toString('hex'));

const witnessScript = bitcoin.script.compile([     //locking script of Bob
    bitcoin.opcodes.OP_DUP,
    bitcoin.opcodes.OP_HASH160,
    Buffer.from(PayeeBobAddr.data, 'Hex'),
    bitcoin.opcodes.OP_EQUALVERIFY,
    bitcoin.opcodes.OP_CHECKSIG
]);
const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPairBob.publicKey ,network})
console.log('Bob runs: bitcoin_cli sendtoaddress  '+ "'"+ p2wpkh.address+ "' 1.0"); //Bob prepares 1.0 BTC.

// =============== Output of the Transaction ===============================
tx.addOutput(payeeScript1, amount); 

// =============== Bob's  scriptSig ===============================
const sighash = tx.hashForWitnessV0(1, witnessScript, utxo_Bob.outs[txIndex_Bob].value, hashtype);
const signature_bob = bitcoin.script.signature.encode(keyPairBob.sign(sighash), hashtype);
tx.setWitness(1, [              //unlocking script of Bob
    signature_bob,
    keyPairBob.publicKey,
]);

// =============== Alice's  scriptSig ===============================
sigStr0 = Buffer.from(sig0).toString('hex');
const scriptSig0 = bitcoin.script.compile([        //unlocking script of Alice
    Buffer.from(sigStr0, 'hex'),
    locking_script_Alice, 
]);
console.log('scriptSig_Alice: ' + Buffer.from(scriptSig0).toString('hex'));
tx.setInputScript(0, scriptSig0);  

//finally, transaction broadcast
console.log("sendrawtransaction " + "'"+ tx.toHex()+ "' 0 1")