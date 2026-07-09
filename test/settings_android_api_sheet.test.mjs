import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [settingsSource, settingsCssSource, globalCssSource] = await Promise.all([
    fs.readFile(new URL('../js/settings.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../css/settings.css', import.meta.url), 'utf8'),
    fs.readFile(new URL('../css/global.css', import.meta.url), 'utf8')
]);

function getFunctionBody(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `Expected to find ${name}`);
    const paramsEnd = source.indexOf(')', start);
    assert.notEqual(paramsEnd, -1, `Expected to find ${name} params`);
    const bodyStart = source.indexOf('{', paramsEnd);
    assert.notEqual(bodyStart, -1, `Expected to find ${name} body`);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) return source.slice(bodyStart + 1, index);
    }
    assert.fail(`Expected to close ${name} body`);
}

function getCssRule(source, selector) {
    const start = source.indexOf(selector);
    assert.notEqual(start, -1, `Expected to find CSS selector ${selector}`);
    const bodyStart = source.indexOf('{', start);
    assert.notEqual(bodyStart, -1, `Expected to find CSS body for ${selector}`);
    const bodyEnd = source.indexOf('}', bodyStart);
    assert.notEqual(bodyEnd, -1, `Expected to close CSS body for ${selector}`);
    return source.slice(bodyStart + 1, bodyEnd);
}

test('API config sheet has scoped Android focus/selection CSS without changing global sheets', () => {
    const apiSheetRule = getCssRule(settingsCssSource, '#api-config-sheet');
    assert.match(apiSheetRule, /position:\s*fixed/);
    assert.match(apiSheetRule, /inset:\s*0/);
    assert.match(apiSheetRule, /overflow-x:\s*hidden/);
    assert.match(apiSheetRule, /touch-action:\s*none/);
    assert.match(settingsCssSource, /#api-config-sheet \.form-item input,\s*\n#api-config-sheet \.form-item select/);
    assert.match(settingsCssSource, /#api-config-sheet \.form-item\s*\{[\s\S]*min-width:\s*0/);

    const globalBottomSheetRule = getCssRule(globalCssSource, '.bottom-sheet-overlay');
    assert.match(globalBottomSheetRule, /position:\s*absolute/);
    assert.doesNotMatch(globalBottomSheetRule, /position:\s*fixed/);
});

test('API config sheet locks home page horizontal scroll while inputs are active', () => {
    assert.match(settingsSource, /const apiConfigHomeScrollLock = \{/);
    assert.match(settingsSource, /function getApiConfigPagesContainer\(\)/);
    assert.match(settingsSource, /document\.getElementById\('pages-container'\)/);

    const lockBody = getFunctionBody(settingsSource, 'lockApiConfigHomeScroll');
    assert.match(lockBody, /apiConfigHomeScrollLock\.scrollLeft = pagesContainer \? pagesContainer\.scrollLeft : 0/);
    assert.match(lockBody, /pagesContainer\.style\.scrollSnapType = 'none'/);
    assert.match(lockBody, /pagesContainer\.style\.overflowX = 'hidden'/);
    assert.match(lockBody, /pagesContainer\.style\.touchAction = 'none'/);

    const restoreBody = getFunctionBody(settingsSource, 'restoreApiConfigHomeScroll');
    assert.match(restoreBody, /pagesContainer\.scrollTo\(\{ left: apiConfigHomeScrollLock\.scrollLeft, behavior: 'auto' \}\)/);
    assert.match(restoreBody, /pagesContainer\.scrollLeft = apiConfigHomeScrollLock\.scrollLeft/);

    const unlockBody = getFunctionBody(settingsSource, 'unlockApiConfigHomeScroll');
    assert.match(unlockBody, /pagesContainer\.style\.overflowX = apiConfigHomeScrollLock\.previousOverflowX/);
    assert.match(unlockBody, /pagesContainer\.style\.touchAction = apiConfigHomeScrollLock\.previousTouchAction/);
    assert.match(unlockBody, /unbindApiConfigViewportLock\(\)/);
});

test('API config open, close, focus, selection, and viewport paths use the scroll lock', () => {
    const openBody = getFunctionBody(settingsSource, 'openApiConfigSheet');
    assert.match(openBody, /lockApiConfigHomeScroll\(\)/);
    assert.match(openBody, /openView\(UI\.overlays\.apiConfig\)/);
    assert.match(openBody, /scheduleApiConfigHomeScrollRestore\(\)/);

    const closeBody = getFunctionBody(settingsSource, 'closeApiConfigSheet');
    assert.match(closeBody, /closeView\(UI\.overlays\.apiConfig\)/);
    assert.match(closeBody, /unlockApiConfigHomeScroll\(\)/);

    assert.match(settingsSource, /openApiConfigSheet\(\)/);
    assert.match(settingsSource, /closeApiConfigSheet\(\)/);
    assert.match(settingsSource, /\[UI\.inputs\.apiEndpoint, UI\.inputs\.apiKey, UI\.inputs\.apiModel, UI\.inputs\.apiTemp\]/);
    assert.match(settingsSource, /input\.addEventListener\('focus', \(\) => \{[\s\S]*lockApiConfigHomeScroll\(\);[\s\S]*scheduleApiConfigHomeScrollRestore\(\);[\s\S]*\}\)/);
    assert.match(settingsSource, /input\.addEventListener\('select', scheduleApiConfigHomeScrollRestore\)/);
    assert.match(settingsSource, /document\.addEventListener\('selectionchange'/);
    assert.match(settingsSource, /window\.visualViewport\.addEventListener\('resize', handleApiConfigViewportChange/);
    assert.match(settingsSource, /window\.visualViewport\.addEventListener\('scroll', handleApiConfigViewportChange/);
});
