'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');
const v8ToIstanbul = require('v8-to-istanbul');

const collectCoverage = process.env.COLLECT_COVERAGE === '1';
const projectRoot = path.resolve(__dirname, '..', '..');
const appScriptPath = path.resolve(projectRoot, 'script.js');
const appScriptUrl = pathToFileURL(appScriptPath).href;
const coverageDir = path.resolve(projectRoot, 'coverage');
const coverageMap = collectCoverage ? libCoverage.createCoverageMap({}) : null;

async function startPageCoverage(page) {
    if (!collectCoverage) return;

    await page.coverage.startJSCoverage({
        resetOnNavigation: false
    });
}

async function stopPageCoverage(page) {
    if (!collectCoverage) return;

    const entries = await page.coverage.stopJSCoverage();

    for (const entry of entries) {
        if (!entry.url) continue;

        let entryPath = null;
        if (entry.url.startsWith('file:')) {
            try {
                entryPath = fileURLToPath(entry.url);
            } catch (error) {
                entryPath = null;
            }
        }

        if (entry.url !== appScriptUrl && entryPath !== appScriptPath) {
            continue;
        }

        const converter = v8ToIstanbul(
            appScriptPath,
            0,
            entry.source ? { source: entry.source } : undefined
        );

        await converter.load();
        converter.applyCoverage(entry.functions);
        coverageMap.merge(converter.toIstanbul());
    }
}

function writeCoverageReport() {
    if (!collectCoverage) return;

    if (coverageMap.files().length === 0) {
        throw new Error('No browser coverage was captured for script.js.');
    }

    fs.rmSync(coverageDir, { recursive: true, force: true });
    fs.mkdirSync(coverageDir, { recursive: true });

    const context = libReport.createContext({
        dir: coverageDir,
        coverageMap
    });

    reports.create('text-summary').execute(context);
    reports.create('html').execute(context);
    reports.create('json-summary').execute(context);
    reports.create('lcovonly').execute(context);
}

module.exports = {
    collectCoverage,
    startPageCoverage,
    stopPageCoverage,
    writeCoverageReport
};
