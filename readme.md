Agreements contract
===================

This contract allows two participants to enter into an arbitrary agreement and requires both parties to confirm and successfully end the agreement.  One party can end the agreement in "contested" mode in which both parties can submit their case as to what went wrong.

Successful and Contested agreements are accumulated and can be used as a reputation system.

A participant can only be involved in one active agreement at any one time.

All participant actions are performed using external signing.  This means users can sign their actions offline and without ETH, and someone else can submit those transactions (and pay the gas) on their behalf in a trustless manner.

Participants can "rollover" their address into a new hashed address. This allows them to retain their reputation and not have a publicly tracable history.  When proving your reputation to an offline party you would obviously have to show them your linked history.

## Compile the contract

To compile the contract, run the following script.  It will output the ABI and BIN into the build folder.  Note this script expects `solc` to be available in your PATH.
```
node compile.js agreements
```

## Run the tests

To run the tests you will need to install the dependencies.
```
npm i
```

You will also need to have `ganache-cli` running on port `7545`.  You will also need `mocha` installed globally.
```
npm i -g ganache-cli
npm i -g mocha
ganache-cli -p 7545
```

Run all the tests with:
```
mocha test/all -b
```