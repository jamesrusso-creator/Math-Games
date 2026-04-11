'use strict';

const test = require('node:test');
const { writeCoverageReport } = require('./support/browser-coverage');

require('./fractions.test');
require('./decimats.test');
require('./place-number.test');

test.after(() => {
    writeCoverageReport();
});
