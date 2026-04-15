'use strict';

const test = require('node:test');
const { writeCoverageReport } = require('./support/browser-coverage');

require('./fractions.test');
require('./decimats.test');
require('./place-number.test');
require('./progress-confirm.test');

test.after(() => {
    writeCoverageReport();
});
