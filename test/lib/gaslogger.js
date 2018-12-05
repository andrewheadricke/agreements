var totalGasConsumed = 0;

var log = function(receipt) {
    totalGasConsumed += receipt.gasUsed;
    console.log('     GasUsed: ' + receipt.gasUsed);
}

var getTotalGasConsumed = function() {
    return totalGasConsumed;
}

module.exports = {
    log: log,
    getTotalGasConsumed: getTotalGasConsumed
};