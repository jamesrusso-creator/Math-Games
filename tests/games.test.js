'use strict';

const test = require('node:test');
const { writeCoverageReport } = require('./support/browser-coverage');

require('./fractions.test');
require('./decimats.test');

test.after(() => {
    writeCoverageReport();
});
