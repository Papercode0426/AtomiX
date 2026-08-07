This document describes the steps to construct the transaction in bitcoin regtest network to demonstrate the practice of the proposed scheme. 

The code is fully compatible with the existing bitcoin network. The experiment was carried on window 10 step-by-step as follows.

1.	Installation

•	bitcoin v31.1.0, https://bitcoincore.org/en/download/

•	bitcoinjs-lib-master, https://github.com/bitcoinjs/bitcoinjs-lib

•	MS VScode https://visualstudio.microsoft.com/zh-hans/downloads/

•	schnorr-verify-master https://github.com/noot/schnorr-verify

•	Node.js  https://nodejs.org/en/download/package-manager  (v24.18.1)

2.	The codes are revisions on two packages: schnorr-verify-master and bitcoinjs-lib-master. Hence, we need to replace some codes. Specifically,

	Overwrite schnorr-verify-master\contracts\schnorr.sol 

	Copy L0_ApayB_ETH_Schnorr.js to folder schnorr-verify-master\test

	Copy other files to folder bitcoinjs-lib-master\

	Compile the codes as the original packages do

3.	In command line of Operation System, run
C:\Program Files\Bitcoin> rmdir /s /q "%APPDATA%\Bitcoin\regtest
   
C:\Program Files\Bitcoin> bitcoin-qt -regtest -rpcport=9050 -rpcuser=youruser -rpcpassword=yourpass -server=1  -maxtxfee=0.01

C\...\bitcoinjs-lib-master> node main.js

4 The output transaction is:

Tx1='020000000001029ca705ed0ecead08c483411f18440d6b835ce21d865126c55642ac38435b901d00000000fd1b01483045022100bdf5d5ab3f291cf07b64f8b3fa26da66946c793e6a065afd7fb7068f4c92894202204483f2c1f55c3d39ed22ef72504ae3dd7e60840c1cb0deb6306d6bb4a972dbd701210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817984c71efbfbd67efbfbd7c14efbfbd771421524c747eefbfbd44010cefbfbdefbfbdefbfbdefbfbd5defbfbd43efbfbdd88d50efbfbdefbfbdefbfbd0aefbfbd5d5e15efbfbdefbfbd73cfbfefbfbd2eefbfbd2fefbfbdefbfbd22efbfbd505aefbfbd48efbfbdefbfbd44125a3810efbfbd12483ca8207a808a777711183554d8bf87f8e3ec0abfb24163670a450dd0699ec20cb2a2518876a914751e76e8199196d454941c45d1b3a323f1433bd688acffffffffc8e057763504dfc83804ab0f87d2bd6a1f4a789b9939f6f6cfc86ba13d1d1e070000000000ffffffff02a0860100000000001976a91406afd46bcdfd22ef94ac122aa11f241244a37ecc88ac20a0f629010000001976a914751e76e8199196d454941c45d1b3a323f1433bd688ac00024830450221009fa3abd6c8104ef4a2ba1e5c4d5a82e58f78d928b048ad1e82b04e29193eb5a402200ea02f5193c239b8adcac554641e5b17d7bee41e242481020112924fad392e60012102c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee500000000'

