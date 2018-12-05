var Web3 = require('web3');
var assert = require('assert');
var gaslogger = require('./lib/gaslogger');

var contract = require('../build/agreements.json').contracts['contracts/agreements.sol:Agreements'];
if (typeof contract.abi == 'string')
contract.abi = JSON.parse(contract.abi);

var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

var accounts;
var agreementIdx = 1;

describe('Open and close successful agreement', function() {

    it('Get ETH accounts', function(done) {
        web3.eth.getAccounts(function(err, result) {
            if (err) throw new Error(err);
            assert.equal(typeof result == 'object', true);
            accounts = result;
            done();
        })
    })
    
    it('Create new agreement', function(done) {
        var unix = Math.round(+new Date()/1000);

        contract.instance.methods.startAgreement(accounts[1], accounts[2], "0x123456")
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

    it('Check new agreement details', function(done) {
        contract.instance.methods.getAgreementDetails(agreementIdx).call(function(err, result) {
            assert.equal(result.u1, accounts[1]);
            assert.equal(result.u2, accounts[2]);
            assert.equal(result.meta, "0x1234560000000000000000000000000000000000000000000000000000000000");
            assert.equal(result.successOrContested, 0);
            done();
        })
    })

    it('User 1 tries confirm agreement with invalid sig', function(done) {
        var v = 0;
        var r = "0x00";
        var s = "0x00";
        contract.instance.methods.confirmAgreement(agreementIdx, v, r, s)
        .send({
            from: accounts[1],
            gas: 3000000
        }, function(err, receipt) {
            if (err) done();
            else done(new Error('Should not succeed'));
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

    it('Check agreement details - half confirmed', function(done) {
        contract.instance.methods.getAgreementDetails(agreementIdx).call(function(err, result) {
            assert.equal(result.u1_ack, true);
            assert.equal(result.u2_ack, false);
            assert.equal(result.blockAgreementConfirmed, 0);
            assert.equal(result.successOrContested, 0);
            done();
        })
    })

    it('User 2 confirms agreement', function(done) {
        var sig = {}
        var msgToSign = "Agreement:Start:";
        var msgHash = web3.utils.soliditySha3(msgToSign, agreementIdx);

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

    it('Check agreement details - full confirmed', function(done) {
        web3.eth.getBlock('latest')
        .then(function(block) {
            var blockNum = block.number;
            contract.instance.methods.getAgreementDetails(agreementIdx).call(function(err, result) {
                assert.equal(result.u1_ack, false);
                assert.equal(result.u2_ack, false);
                assert.equal(result.blockAgreementConfirmed, blockNum);
                assert.equal(result.successOrContested, 0);
                done();
            })
        })        
    })

    it('User 1 end agreement', function(done) {
        var sig = {}
        var msgToSign = "Agreement:End:";
        var msgHash = web3.utils.soliditySha3(msgToSign, agreementIdx);

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
                contract.instance.methods.endAgreementSuccess(agreementIdx, sig.v, sig.r, sig.s)
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

    it('Check agreement details - partial ended', function(done) {
        web3.eth.getBlock('latest')
        .then(function(block) {
            var blockNum = block.number;
            contract.instance.methods.getAgreementDetails(agreementIdx).call(function(err, result) {
                assert.equal(result.u1_ack, true);
                assert.equal(result.u2_ack, false);
                assert.equal(result.blockAgreementConfirmed > 0, true);
                assert.equal(result.blockAgreementEnded, 0);
                assert.equal(result.successOrContested, 0);
                done();
            })
        })        
    })

    it('User 2 end agreement', function(done) {
        var sig = {}
        var msgToSign = "Agreement:End:";
        var msgHash = web3.utils.soliditySha3(msgToSign, agreementIdx);

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
                contract.instance.methods.endAgreementSuccess(agreementIdx, sig.v, sig.r, sig.s)
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

    it('Check agreement details - fully ended', function(done) {
        web3.eth.getBlock('latest')
        .then(function(block) {
            var blockNum = block.number;
            contract.instance.methods.getAgreementDetails(agreementIdx).call(function(err, result) {
                assert.equal(result.u1_ack, true);
                assert.equal(result.u2_ack, true);
                assert.equal(result.blockAgreementConfirmed > 0, true);
                assert.equal(result.blockAgreementEnded, blockNum);
                assert.equal(result.successOrContested, 1);
                done();
            })
        })        
    })
})