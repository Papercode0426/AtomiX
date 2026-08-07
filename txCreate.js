import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { BitcoinRPCClient, ECPair, network } from './rpc-client.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const hashtype = bitcoin.Transaction.SIGHASH_ALL;

async function txCreate(client) {
    // =============== 1. Bob's UTXO (P2WSH) ===============
    const TWO = Buffer.from('0000000000000000000000000000000000000000000000000000000000000002', 'hex');
    const keyPairBob = ECPair.fromPrivateKey(TWO, { network });
    
    const witnessScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,
        bitcoin.crypto.hash160(keyPairBob.publicKey),
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG
    ]);

    const p2wpkh = bitcoin.payments.p2wpkh({ 
        pubkey: keyPairBob.publicKey, 
        network 
    });

    const amountToSend = 0.01;
    const feeSatoshis = 2000;

    const keyPairInfoBob = client.getKeyPairFromHex(TWO);
    const txid_Bob = await client.sendFromAddress(
        keyPairInfoBob.address, 
        p2wpkh.address, 
        amountToSend, 
        feeSatoshis
    );
    const txIndex_Bob = 0;   

    // =============== 2. Alice UTXO (P2SH) ===============
    const ONE = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex');
    const keyPairAlice = ECPair.fromPrivateKey(ONE, { network });

    var x0 = (Buffer.from(keyPairBob.publicKey)).toString('hex');
    var x1 = (Buffer.from(keyPairAlice.publicKey)).toString('hex');
    var str= x0.concat(' ',  txid_Bob, txIndex_Bob.toString(), x0,  x1, amountToSend.toString(), hashtype.toString()) 
    var hashOut = bitcoin.crypto.sha256(str);
    var sigA1 = keyPairAlice.sign(hashOut);
    //console.log('sigA1:', Buffer.from(sigA1, 'Hex').toString('hex'));

    const aliceSecret = Buffer.from(Buffer.from(sigA1, 'Hex').toString('utf8'), 'utf8');
    const aliceSecretHash = bitcoin.crypto.sha256(aliceSecret);

    const aliceRedeemScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_SHA256,
        aliceSecretHash,
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,
        bitcoin.crypto.hash160(keyPairAlice.publicKey),
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG
    ]);

    //console.log('Alice redeem script:', aliceRedeemScript.toString('hex'));

    const p2sh = bitcoin.payments.p2sh({
        redeem: { output: aliceRedeemScript, network },
        network
    });

    console.log('Alice P2SH address:', p2sh.address);

    const amountAlice = 0.001;
    const txid_Alice = await client.sendFromAddress(
        keyPairInfoBob.address,
        p2sh.address, 
        amountAlice, 
        feeSatoshis
    );
     const txIndex_Alice = 0;

    await client.generateToAddress(2, keyPairInfoBob.address);
    await new Promise(resolve => setTimeout(resolve, 5000));
    const txDetailAlice = await client.getWalletTransaction(txid_Alice);
    let previousTxHex_Alice = null;
    if (txDetailAlice.blockhash) {
        try {
            previousTxHex_Alice = await client.call('getrawtransaction', [txid_Alice, false, txDetailAlice.blockhash]);
        } catch (error) {
            console.log('   getrawtransaction Failed:', error.message);
        }
    }

    const txDetailBob = await client.getWalletTransaction(txid_Bob);
    let previousTxHex_Bob = null;
    if (txDetailBob.blockhash) {
        try {
            previousTxHex_Bob = await client.call('getrawtransaction', [txid_Bob, false, txDetailBob.blockhash]);
        } catch (error) {
            console.log('   getrawtransaction Failed:', error.message);
        }
    }

    // =============== 5. Parse UTXO ===============
    const utxo_Alice = bitcoin.Transaction.fromHex(previousTxHex_Alice);
    const utxo_Bob = bitcoin.Transaction.fromHex(previousTxHex_Bob);
    
    const amountFromUTXO_Alice = Number(utxo_Alice.outs[0].value);
    const amountFromUTXO_Bob = Number(utxo_Bob.outs[0].value);

    console.log('Alice UTXO Balance:', amountFromUTXO_Alice, 'Satoshis');
    console.log('Bob UTXO Balance:', amountFromUTXO_Bob, 'Satoshis');

    // =============== 6. Craete Tx ===============
    const tx = new bitcoin.Transaction(network);
    tx.version = 2;
    
    tx.addInput(Buffer.from(txid_Alice, 'hex').reverse(), txIndex_Alice);
    tx.addInput(Buffer.from(txid_Bob, 'hex').reverse(), txIndex_Bob);

    const totalInput = amountFromUTXO_Alice + amountFromUTXO_Bob;
    const outputAmount = 100000;
    const feeAmount = 2000;
    const changeAmount = totalInput - outputAmount - feeAmount;

    console.log('\nTotal Input:', totalInput, 'Satoshis');
    console.log('Output:', outputAmount, 'Satoshis');
    console.log('Fee:', feeAmount, 'Satoshis');
    console.log('Change:', changeAmount, 'Satoshis');

    if (changeAmount < 0) {
        throw new Error(`Balance Insufficient: ${totalInput} < ${outputAmount + feeAmount}`);
    }

    const outputScript = bitcoin.payments.p2pkh({
        pubkey: keyPairBob.publicKey,
        network
    }).output;
    tx.addOutput(outputScript, BigInt(outputAmount));

    const changeScript = bitcoin.payments.p2pkh({
        pubkey: keyPairAlice.publicKey,
        network
    }).output;
    tx.addOutput(changeScript, BigInt(changeAmount));

    // =============== 7. Alice Input (P2SH) ===============
    const sighashAlice = tx.hashForSignature(0, aliceRedeemScript, hashtype);
    const signatureAlice = keyPairAlice.sign(sighashAlice);
    const signatureAliceWithHash = bitcoin.script.signature.encode(signatureAlice, hashtype);
    const scriptSigAlice = bitcoin.script.compile([
        signatureAliceWithHash,   
        keyPairAlice.publicKey,   
        aliceSecret,             
        aliceRedeemScript
    ]);
    tx.setInputScript(0, scriptSigAlice);

    // =============== 8. Bob Input (P2WSH) ===============
    const sighashBob = tx.hashForWitnessV0(1, witnessScript, BigInt(amountFromUTXO_Bob), hashtype);
    const signatureBob = keyPairBob.sign(sighashBob);
    const signatureBobWithHash = bitcoin.script.signature.encode(signatureBob, hashtype);
    
    tx.setWitness(1, [
        signatureBobWithHash,
        keyPairBob.publicKey
    ]);

  
    console.log('totalInput:', totalInput, 'Satoshis');
    console.log('totalOutput:', outputAmount + changeAmount, 'Satoshis');
    console.log('actualFee:', totalInput - outputAmount - changeAmount, 'Satoshis');

    const txHex = tx.toHex();
    console.log("sendrawtransaction " + "'"+ tx.toHex()+ "' 0 1");

    client.sendRawTransaction(tx.toHex(), 0, 1).then((txid) => {
    console.log('✅ Tx broadcasted! TxID:', txid);  }).catch((error) => {
    console.error('❌ Tx broadcast failed:', error.message);  });
}

export { txCreate };