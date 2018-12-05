var Web3 = require('web3');
var assert = require('assert');
var gaslogger = require('./lib/gaslogger');

var contract = require('../build/agreements.json').contracts['contracts/agreements.sol:Agreements'];
if (typeof contract.abi == 'string')
contract.abi = JSON.parse(contract.abi);

var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

var accounts;

describe('Deploy contracts', function() {

    it('Get ETH accounts', function(done) {
        web3.eth.getAccounts(function(err, result) {
            if (err) throw new Error(err);
            assert.equal(typeof result == 'object', true);
            accounts = result;
            done();
        })
    })

    it('Deploy contract', function(done) {
        var bc = new web3.eth.Contract(contract.abi);
        bc.deploy({data: contract.bin})
        .send({
            from: accounts[0],
            gas: 3000000
        })
        .on('error', function(err) {
            throw new Error(err);
        })
        .on('receipt', function(receipt) {
            gaslogger.log(receipt);
            assert.equal(receipt.contractAddress.length >= 40, true);
            contract.instance = new web3.eth.Contract(contract.abi, receipt.contractAddress);
            done();
        })
    })

})