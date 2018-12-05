var gaslogger = require('./lib/gaslogger');

require('./deploy');
require('./successful');
require('./rollover');
require('./contested');

describe('Finally', function() {
    it('Total gas consumed', function() {
        console.log('     Total GasUsed: ' + gaslogger.getTotalGasConsumed());
    })
})
