var Web3 = require('web3');
var assert = require('assert');
var gaslogger = require('./lib/gaslogger');

var contract = require('../build/agreements.json').contracts['contracts/agreements.sol:Agreements'];
if (typeof contract.abi == 'string')
contract.abi = JSON.parse(contract.abi);

var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

var accounts;
var agreementIdx = 2;

describe('Account rollover', function() {

    it('Get ETH accounts', function(done) {
        web3.eth.getAccounts(function(err, result) {
            if (err) throw new Error(err);
            assert.equal(typeof result == 'object', true);
            accounts = result;
            done();
        })
    })

    var newAccountHash;
    it('Rollover user 2 account', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Rollover";
        var msgHash = web3.utils.soliditySha3(msgToSign);
        var nonce = 1;

        newAccountHash = web3.utils.soliditySha3(nonce, accounts[3]);

        // sign the message
        web3.eth.sign(msgHash, accounts[2])
        .then(function(result) {
            // parse out sig
            result = result.substr(2);
            sig.r = "0x" + result.substr(0, 64);
            sig.s = "0x" + result.substr(64, 64);
            sig.v = web3.utils.toDecimal(result.substr(128)) + 27;
        })
        .then(function() {
            // submit the tx
            return new Promise(function(resolve, reject) {
                contract.instance.methods.rolloverAccount(newAccountHash, sig.v, sig.r, sig.s)
                .send({
                    from: accounts[1],
                    gas: 3000000
                }, function(err, receipt) {
                    if (err) {done(new Error(err)); return;}
                    assert.equal(receipt.length, 66);
                    resolve(receipt);
                })
            })
        })
        .then(function(receipt) {
            // get tx receipt
            web3.eth.getTransactionReceipt(receipt)
            .then(function(receipt) {
                gaslogger.log(receipt);                
                done();
            })
        })
    })

    it('Check user 2 details - rollover hash', function(done) {
        contract.instance.methods.getUserDetails(accounts[2]).call(function(err, result) {
            assert.equal(result.successful, 1);
            assert.equal(result.contested, 0);
            assert.equal(result.rolloverHash, newAccountHash);
            done();
        })
    })

    it('Try rollover a second time - Should fail', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Rollover";
        var msgHash = web3.utils.soliditySha3(msgToSign);
        var nonce = 1;

        newAccountHash = web3.utils.soliditySha3(nonce, accounts[3]);

        // sign the message
        web3.eth.sign(msgHash, accounts[2])
        .then(function(result) {
            // parse out sig
            result = result.substr(2);
            sig.r = "0x" + result.substr(0, 64);
            sig.s = "0x" + result.substr(64, 64);
            sig.v = web3.utils.toDecimal(result.substr(128)) + 27;
        })
        .then(function() {
            // submit the tx
            return new Promise(function(resolve, reject) {
                contract.instance.methods.rolloverAccount(newAccountHash, sig.v, sig.r, sig.s)
                .send({
                    from: accounts[1],
                    gas: 3000000
                }, function(err, receipt) {
                    if (err) {
                        done(); 
                        resolve();
                    }
                    else {
                        done('Should not suceed');
                        resolve();
                    }
                })
            })
        })
    })

    it('Try rollover an unknown account - Should fail', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Rollover";
        var msgHash = web3.utils.soliditySha3(msgToSign);
        var nonce = 1;

        newAccountHash = web3.utils.soliditySha3(nonce, accounts[3]);

        // sign the message
        web3.eth.sign(msgHash, accounts[4])
        .then(function(result) {
            // parse out sig
            result = result.substr(2);
            sig.r = "0x" + result.substr(0, 64);
            sig.s = "0x" + result.substr(64, 64);
            sig.v = web3.utils.toDecimal(result.substr(128)) + 27;
        })
        .then(function() {
            // submit the tx
            return new Promise(function(resolve, reject) {
                contract.instance.methods.rolloverAccount(newAccountHash, sig.v, sig.r, sig.s)
                .send({
                    from: accounts[1],
                    gas: 3000000
                }, function(err, receipt) {
                    if (err) {
                        done(); 
                        resolve();
                    }
                    else {
                        done('Should not suceed');
                        resolve();
                    }
                })
            })
        })
    })

    it('Create new agreement', function(done) {
        contract.instance.methods.startAgreement(accounts[1], accounts[3], "0x123456")
        .send({
            from: accounts[1],
            gas: 3000000
        }, function(err, receipt) {
            if (err) {done(new Error(err)); return;}
            web3.eth.getTransactionReceipt(receipt)
            .then(function(receipt) {
                gaslogger.log(receipt);
                assert.equal(receipt.transactionHash >= 66, true);
                done();
            })
        })
    })

    it('User 1 confirms agreement', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Start:";
        var msgHash = web3.utils.soliditySha3(msgToSign, agreementIdx);

        web3.eth.sign(msgHash, accounts[1])
        .then(function(result) {            
            result = result.substr(2);
            sig.r = "0x" + result.substr(0, 64);
            sig.s = "0x" + result.substr(64, 64);
            sig.v = web3.utils.toDecimal(result.substr(128)) + 27;
        })
        .then(function() {
            contract.instance.methods.confirmAgreement(agreementIdx, sig.v, sig.r, sig.s)
            .send({
                from: accounts[1],
                gas: 3000000
            }, function(err, receipt) {
                web3.eth.getTransactionReceipt(receipt)
                .then(function(receipt) {
                    gaslogger.log(receipt);
                    assert.equal(receipt.transactionHash >= 66, true);
                    done();
                })
            })
        })
    })

    it('User 2 confirms agreement', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Start:";
        var msgHash = web3.utils.soliditySha3(msgToSign, agreementIdx);

        // sign the message
        web3.eth.sign(msgHash, accounts[3])
        .then(function(result) {            
            // parse out sig
            result = result.substr(2);
            sig.r = "0x" + result.substr(0, 64);
            sig.s = "0x" + result.substr(64, 64);
            sig.v = web3.utils.toDecimal(result.substr(128)) + 27;
        })
        .then(function() {
            // submit the tx
            return new Promise(function(resolve, reject) {
                contract.instance.methods.confirmAgreement(agreementIdx, sig.v, sig.r, sig.s)
                .send({
                    from: accounts[1],
                    gas: 3000000
                }, function(err, receipt) {
                    if (err) {done(new Error(err)); return;}
                    assert.equal(receipt.length, 66);
                    resolve(receipt);
                })
            })
        })
        .then(function(receipt) {
            // get tx receipt
            web3.eth.getTransactionReceipt(receipt)
            .then(function(receipt) {
                assert.equal(receipt.logs.length, 1);
                assert.equal(receipt.logs[0].topics[0], "0x34f4884a8bd06901d8ae04ad5943e57c9cacb0d58a1dcbf3503897e12ec05aec");
                gaslogger.log(receipt);                
                done();
            })
        })
    })  
    
    it('Try rollover while in a active agreement - Should fail', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Rollover";
        var msgHash = web3.utils.soliditySha3(msgToSign);
        var nonce = 1;

        newAccountHash = web3.utils.soliditySha3(nonce, accounts[3]);

        // sign the message
        web3.eth.sign(msgHash, accounts[1])
        .then(function(result) {
            // parse out sig
            result = result.substr(2);
            sig.r = "0x" + result.substr(0, 64);
            sig.s = "0x" + result.substr(64, 64);
            sig.v = web3.utils.toDecimal(result.substr(128)) + 27;
        })
        .then(function() {
            // submit the tx
            return new Promise(function(resolve, reject) {
                contract.instance.methods.rolloverAccount(newAccountHash, sig.v, sig.r, sig.s)
                .send({
                    from: accounts[1],
                    gas: 3000000
                }, function(err, receipt) {
                    if (err) {
                        done(); 
                        resolve();
                    }
                    else {
                        done('Should not suceed');
                        resolve();
                    }
                })
            })
        })
    })
})