'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { checkBrowserRuntime } = require('../browser-runtime');

test('reports a missing browser before accepting updates', async () => {
    const result = await checkBrowserRuntime({ executablePath: null });
    assert.equal(result.ready, false);
    assert.match(result.issue, /not found/i);
});

test('reports when the helper cannot spawn child processes', async () => {
    const result = await checkBrowserRuntime({
        executablePath: 'C:\\Browser\\chrome.exe',
        probe: async () => false,
    });
    assert.equal(result.ready, false);
    assert.match(result.issue, /blocking the helper/i);
});

test('reports a blocked runtime when the launch probe rejects', async () => {
    const result = await checkBrowserRuntime({
        executablePath: 'C:\\Browser\\chrome.exe',
        probe: async () => { throw new Error('probe failed'); },
    });
    assert.equal(result.ready, false);
    assert.match(result.issue, /blocking the helper/i);
});

test('reports a ready browser runtime after a successful child-process probe', async () => {
    const result = await checkBrowserRuntime({
        executablePath: 'C:\\Browser\\chrome.exe',
        probe: async () => true,
    });
    assert.deepEqual(result, { ready: true, browser: 'chrome.exe', issue: null });
});
