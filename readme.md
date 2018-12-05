Agreements contract
===================

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