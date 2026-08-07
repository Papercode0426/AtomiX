
import { BitcoinRPCClient, ECPair, network } from './rpc-client.js';
import base58check from 'base58check';  
import * as bitcoin from 'bitcoinjs-lib';
import { txCreate } from './txCreate.js';
async function main() 
{
    const client = new BitcoinRPCClient('http://127.0.0.1:9050/',  'youruser', 'yourpass'  );

    try 
    {
        console.log('📡 1. Check RPC ...');
        const blockchainInfo = await client.getBlockchainInfo();
        console.log(`   ✅ Block height: ${blockchainInfo.blocks}`);

        // ========== 2. Load wallet ==========
        const walletName = 'mywallet';
        await client.ensureWallet(walletName);

        const walletInfo = await client.getWalletInfo();
        console.log(`   ✅ Wallet: ${walletInfo.walletname}`);
        console.log(`   💰 Balance: ${walletInfo.balance !== undefined ? walletInfo.balance + ' BTC' : 'N/A'}`);

        // ========== 3. Import Bob's private key ==========
        const privateKeyHexBob = '0000000000000000000000000000000000000000000000000000000000000002';
        const keyPairInfoBob = client.getKeyPairFromHex(privateKeyHexBob);
        console.log(`   Bob address: ${keyPairInfoBob.address}`);

        await client.importPrivateKeyCombo(keyPairInfoBob.wif, 0);
        console.log('   Waiting for wallet scan to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const addressInfo = await client.getAddressInfo(keyPairInfoBob.address);
        if (addressInfo) {
            console.log(`   ismine: ${addressInfo.ismine}`);
        }

        var utxos = await client.listUnspent(keyPairInfoBob.address, 0, 9999999);

        while (utxos.length === 0) {
            console.log('   Mining 110 blocks to Bob address...');
            await client.generateToAddress(110, keyPairInfoBob.address);        
            await new Promise(resolve => setTimeout(resolve, 5000));
            utxos = await client.listUnspent(keyPairInfoBob.address, 0, 9999999);
        }
        console.log(`   Found ${utxos.length} confirmed UTXOs`);

        let totalSat = 0;
        for (const utxo of utxos) {
            const sat = Math.round(utxo.amount * 1e8);
            console.log(`   - ${utxo.txid.substring(0, 10)}... vout:${utxo.vout} amount:${utxo.amount} BTC (${sat} sats) confirmations:${utxo.confirmations}`);
            totalSat += sat;
        }
        console.log(`   💰 Total balance: ${totalSat} sats (${totalSat / 1e8} BTC)`);

        txCreate(client) 
 
        const finalInfo = await client.getBlockchainInfo();
        const finalWallet = await client.getWalletInfo();
        console.log(`   Block height: ${finalInfo.blocks}`);
        console.log(`   Wallet balance: ${finalWallet.balance !== undefined ? finalWallet.balance + ' BTC' : 'N/A'}`);
    } catch (error) {
        console.error('\n❌ Program execution failed:', error.message);
    }
}

main().catch(console.error);