const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');

test('medicine inventory API does not disclose stock without an authenticated session', async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        for (const path of ['/api/medicine/get', '/api/medicine/search?name=paracetamol']) {
            const response = await fetch(`${base}${path}`);
            assert.equal(response.status, 401, `${path} should require an authenticated session`);
        }
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
