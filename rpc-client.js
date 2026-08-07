
import axios from 'axios';
import { Buffer } from 'buffer';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);
const network = bitcoin.networks.regtest;

class BitcoinRPCClient {
    constructor(url, username, password) {
        this.url = url;
        this.auth = Buffer.from(`${username}:${password}`).toString('base64');
    }

    async call(method, params = []) {
        try {
            const response = await axios.post(this.url, {
                jsonrpc: '1.0',
                id: '1',
                method: method,
                params: params
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${this.auth}`
                }
            });

            if (response.data.error) {
                throw new Error(`RPC Error (${response.data.error.code}): ${response.data.error.message}`);
            }

            return response.data.result;
        } catch (error) {
            if (error.response) {
                const errorData = error.response.data;
                let errorMessage = `HTTP Error ${error.response.status}`;
                if (errorData && typeof errorData === 'object') {
                    if (errorData.error) {
                        errorMessage += `: ${errorData.error.message || JSON.stringify(errorData.error)}`;
                    } else {
                        errorMessage += `: ${JSON.stringify(errorData)}`;
                    }
                } else {
                    errorMessage += `: ${errorData}`;
                }
                throw new Error(errorMessage);
            }
            throw error;
        }
    }

    // ============ Wallet Management ============
    async createWallet(walletName) {
        try {
            console.log(`Creating wallet "${walletName}"...`);
            const result = await this.call('createwallet', [walletName]);
            console.log(`✅ Wallet "${walletName}" created successfully`);
            return result;
        } catch (error) {
            if (error.message.includes('Database already exists') || 
                error.message.includes('already exists')) {
                console.log(`ℹ️ Wallet "${walletName}" already exists, skipping creation`);
                return null;
            }
            throw error;
        }
    }

    async loadWallet(walletName) {
        try {
            console.log(`Loading wallet "${walletName}"...`);
            const result = await this.call('loadwallet', [walletName]);
            console.log(`✅ Wallet "${walletName}" loaded successfully`);
            return result;
        } catch (error) {
            if (error.message.includes('already loaded')) {
                console.log(`ℹ️ Wallet "${walletName}" is already loaded`);
                return null;
            }
            if (error.message.includes('Path does not exist') || 
                error.message.includes('Wallet file not found')) {
                throw new Error(`WALLET_NOT_FOUND: ${error.message}`);
            }
            throw error;
        }
    }

    async ensureWallet(walletName) {
        try {
            await this.loadWallet(walletName);
            return true;
        } catch (error) {
            if (error.message.startsWith('WALLET_NOT_FOUND')) {
                console.log(`ℹ️ Wallet "${walletName}" not found, creating...`);
                await this.createWallet(walletName);
                return true;
            }
            throw error;
        }
    }

    async getNewAddress(label = '', addressType = 'bech32') {
        try {
            const result = await this.call('getnewaddress', [label, addressType]);
            return result;
        } catch (error) {
            console.error('Failed to get new address:', error.message);
            throw error;
        }
    }

    // ============ Private Key Management ============
    async importPrivateKeyCombo(wifPrivateKey, timestamp = 0) {
        try {
            const descriptorInfo = await this.call('getdescriptorinfo', [`combo(${wifPrivateKey})`]);
            const checksum = descriptorInfo.checksum;

            const fullDescriptor = `combo(${wifPrivateKey})#${checksum}`;

            const importResult = await this.call('importdescriptors', [[{
                desc: fullDescriptor,
                timestamp: timestamp
            }]]);

            return {
                success: true,
                descriptor: fullDescriptor
            };
        } catch (error) {
            console.error('Failed to import private key:', error.message);
            throw error;
        }
    }

    // ============ Address Information ============
    async getAddressInfo(address) {
        try {
            const result = await this.call('getaddressinfo', [address]);
            return result;
        } catch (error) {
            console.error('Failed to get address info:', error.message);
            return null;
        }
    }

    // ============ Blockchain Operations ============
    async getBlockchainInfo() {
        try {
            const result = await this.call('getblockchaininfo');
            return result;
        } catch (error) {
            console.error('Failed to get blockchain info:', error.message);
            throw error;
        }
    }

    async generateToAddress(blocks, address) {
        try {
            console.log(`⛏️ Generating ${blocks} blocks to ${address}...`);
            const result = await this.call('generatetoaddress', [blocks, address]);
            console.log(`✅ Mining complete, generated ${result.length} blocks`);
            return result;
        } catch (error) {
            console.error('Mining failed:', error.message);
            throw error;
        }
    }

    // ============ UTXO and Transaction Queries ============
    async listUnspent(address = null, minConf = 1, maxConf = 9999999) {
        try {
            let params = [minConf, maxConf];
            if (address) {
                params.push([address]);
            }
            const result = await this.call('listunspent', params);
            return result;
        } catch (error) {
            console.error('Failed to list unspent outputs:', error.message);
            throw error;
        }
    }

    async getTransactionHex(txid, blockhash = null) {
        try {
            let params = [txid, false];
            if (blockhash) {
                params.push(blockhash);
            }
            const hex = await this.call('getrawtransaction', params);
            return hex;
        } catch (error) {
            console.error('Failed to get transaction hex:', error.message);
            throw error;
        }
    }

    async getWalletTransaction(txid) {
        try {
            const result = await this.call('gettransaction', [txid]);
            return result;
        } catch (error) {
            console.error('Failed to get wallet transaction:', error.message);
            throw error;
        }
    }

    async getWalletInfo() {
        try {
            const result = await this.call('getwalletinfo');
            return result;
        } catch (error) {
            console.error('Failed to get wallet info:', error.message);
            throw error;
        }
    }

    // ============ Send Transaction ============
    async sendRawTransaction(txHex) {
        try {
            const txid = await this.call('sendrawtransaction', [txHex]);
            return txid;
        } catch (error) {
            console.error('Failed to broadcast transaction:', error.message);
            throw error;
        }
    }

async sendFromAddress(fromAddress, toAddress, amountBTC, feeSatoshis = 2000) {
    try {
        const amountSatoshis = Math.round(amountBTC * 1e8);
        console.log(`💸 From ${fromAddress} sending ${amountBTC} BTC (${amountSatoshis} sats) to ${toAddress}`);

        const utxos = await this.listUnspent(fromAddress, 100, 9999999);
        
        if (utxos.length === 0) {
            throw new Error(`Address ${fromAddress} has no confirmed UTXOs`);
        }
        console.log(`   Found ${utxos.length} confirmed UTXOs`);

        const inputs = [];
        let totalInput = 0;
        const totalNeeded = amountSatoshis + feeSatoshis;

        utxos.sort((a, b) => b.confirmations - a.confirmations);

        for (const utxo of utxos) {
            const amountSat = Math.round(utxo.amount * 1e8);
            console.log(`   - ${utxo.txid.substring(0, 10)}... vout:${utxo.vout} amount:${utxo.amount} BTC (${amountSat} sats) confirmations:${utxo.confirmations}`);
            
            inputs.push({
                txid: utxo.txid,
                vout: utxo.vout
            });
            totalInput += amountSat;
            
            if (totalInput >= totalNeeded) break;
        }

        console.log(`   totalInput: ${totalInput} sats (${totalInput / 1e8} BTC)`);

        if (totalInput < totalNeeded) {
            throw new Error(`Balance insufficient: Total balance ${totalInput} sats, needed ${totalNeeded} sats`);
        }

        const outputs = {};
        outputs[toAddress] = amountSatoshis / 1e8;
        
        const change = totalInput - amountSatoshis - feeSatoshis;
        if (change > 0) {
            outputs[fromAddress] = change / 1e8;
            console.log(`   Change: ${change} sats (${change / 1e8} BTC)`);
        }

        const rawTx = await this.call('createrawtransaction', [inputs, outputs]);

        const signedResult = await this.call('signrawtransactionwithwallet', [rawTx]);
        
        if (!signedResult.complete) {
            console.error('   Signing failed:', signedResult.errors);
            throw new Error('Transaction signature incomplete');
        }

        const signedTx = signedResult.hex;
        const txid = await this.call('sendrawtransaction', [signedTx]);
        console.log(`✅ Transaction broadcast! TxID: ${txid}`);
        return txid;

    } catch (error) {
        console.error('Sending failed:', error.message);
        throw error;
    }
}
    getKeyPairFromHex(privateKeyHex) {
        try {
            const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'), { network });
            const wif = keyPair.toWIF();
            const { address } = bitcoin.payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network: network
            });
            return {
                wif: wif,
                address: address,
                publicKey: keyPair.publicKey.toString('hex')
            };
        } catch (error) {
            console.error('Failed to generate key pair from hex:', error.message);
            throw error;
        }
    }
}

export { BitcoinRPCClient, ECPair, network };