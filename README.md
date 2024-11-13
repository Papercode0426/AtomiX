This document describes the steps to construct the transaction in bitcoin regtest network to demonstrate the practice of the proposed scheme. 

The code is fully compatible with the existing bitcoin network. The experiment was carried on window 10 step-by-step as follows.

1.	Installation

•	bitcoin-28.0-win64-setup, https://bitcoincore.org/en/download/

•	bitcoinjs-lib-master https://github.com/bitcoinjs/bitcoinjs-lib

•	MS VScode https://visualstudio.microsoft.com/zh-hans/downloads/

•	schnorr-verify-master https://github.com/noot/schnorr-verify

•	Node.js  https://nodejs.org/en/download/package-manager

3.	The codes are revisions on two packages: schnorr-verify-master and bitcoinjs-lib-master. Hence, we need to replace some codes. Specifically,

	Overwrite schnorr-verify-master\contracts\schnorr.sol 

	Copy L0_ApayB_ETH_Schnorr.js to folder schnorr-verify-master\test

	Copy L1_BpayA_BTC_ECDSA.js to folder bitcoinjs-lib-master\

	Compile the codes as the original packages do

4.	In command line of Operation System, run
bitcoin-qt -regtest 
5.	With the application bitcoin-qt, create 3 wallets. Denote the wallet names as “AliceWallet1”, and “BobWallet1”
6.	In the command line of bitcoin-qt, create an address for each wallet with command getnewaddress.  Denote the address names as “AliceAddress1”, and “BobAddress1” 
7.	Select wallet “AliceWallet1”, in the command line of bitcoin-qt, run  generatetoaddress  1 “AliceAddress1”
8.	Select wallet “BobWallet1”, In the command line of bitcoin-qt, run >  generatetoaddress 101 “BobAddress1”
9.	compile this.js with VScode, generate the 1st raw-transaction, run the output of line 96, and replace variable previousTxHex_Bob (line 33) and txIndex_Bob (line 34)
10.	compile the revised this.js, generate the 2nd raw-transaction, run the output of line 77, and replace variable previousTxHex_Alice (line 39) and txIndex_Bob (line 40)
11.	compile the doubly-revised this.js, generate the 3rd raw-transaction
12.	broadcast the output of line 119 

sendrawtransaction '0100000000010271db32fc8dd2779b5cc3d966ff294852d1ef0aaf30d57f76d57c8642f991507d01000000604630440220172a3ff4296861d438e4f1e509c48ab9cd5c625bd113b27039578e1576628d81022072f417e80ac2e31387e45488000321423f1cafd016ea00754bd13a9c5bd9986a18a914454f40b2823f55bd3967716777daf5e7f63d32b18851ffffffff43fddb8022220cf99554577673b85871c7bdbeed213d65a9ba9451b95c72bc890100000000ffffffff0100e1f505000000001976a9142408e8329ae410b4d82c8d104f832cd53666e5d988ac000247304402203ab34df9c87a39cf9b1e711d524dd39e4af354690df070f8032536f2b5d988420220061d7ce10a60730a6e65096f23fbb315c624e45fa95b6df1f89792a66034bac6012102c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee500000000' 0 1
>2a6d2b7e7a1072a12306621d8c588f5bbc3bd5bc9b0295427d1cdd809cc1d28c

12.	The UTXO in the above transaction can be spent normally. The previous transactions prTxA1, prTxB1 and transaction Tx1 are as follows.
prTxA1='020000000001014fd909f14a4c5886c6d450a38becce4b7d96549e8b4b01b6486bfd40e1d7685b0000000000fdffffff028c5e4025000000001976a914afb52a6812e0df54ea24b4f582d46b14366869c088ac102700000000000017a914e58c9fab968545e1397ff57663909f373263266d870247304402201f77831b567a2726d4981638baebd3839c03bb91a1c0969dcf47b9c1cbd68c46022023ebac1e659b4eb1b7a3b7d7a7cd952d9fa2a1efcfc4d2a5e899e189642a349501210302617e109fe908a877e74c59f364ab0718fe0861c6832fe17da1098626deb5b000000000'

prTxB1='020000000001019b2a5065fecf9ff1cc3576be86d1c121a19b2ff681e5be974de96470927b2c660000000000fdffffff0200a54a1f000000001976a914c337652b315feb1cdd432a2698cfe5c923014e0588ac00e1f5050000000016001406afd46bcdfd22ef94ac122aa11f241244a37ecc0247304402206a61b419b5f2ec262ae3e0ae13dfd6beb764031e79e9a0e5eb1377c9686d97f502203961ae2b010cab1dceeebbc5c8e298b9c329904e533c247b120ff316e959a24401210302617e109fe908a877e74c59f364ab0718fe0861c6832fe17da1098626deb5b000000000'

Tx1='0100000000010271db32fc8dd2779b5cc3d966ff294852d1ef0aaf30d57f76d57c8642f991507d01000000604630440220172a3ff4296861d438e4f1e509c48ab9cd5c625bd113b27039578e1576628d81022072f417e80ac2e31387e45488000321423f1cafd016ea00754bd13a9c5bd9986a18a914454f40b2823f55bd3967716777daf5e7f63d32b18851ffffffff43fddb8022220cf99554577673b85871c7bdbeed213d65a9ba9451b95c72bc890100000000ffffffff0100e1f505000000001976a9142408e8329ae410b4d82c8d104f832cd53666e5d988ac000247304402203ab34df9c87a39cf9b1e711d524dd39e4af354690df070f8032536f2b5d988420220061d7ce10a60730a6e65096f23fbb315c624e45fa95b6df1f89792a66034bac6012102c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee500000000'
>
