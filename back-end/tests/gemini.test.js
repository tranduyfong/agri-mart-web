const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const gemini = require('../src/configs/gemini.config');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_ENABLED; delete process.env.GEMINI_MODEL; });

test('Gemini dùng key ở header backend, JSON schema và timeout; không có quyền đặt đơn', async () => {
    process.env.GEMINI_API_KEY = 'test-only-key';
    assert.equal(gemini.isEnabled(), true);
    global.fetch = async (url, options) => {
        assert.ok(String(url).startsWith('https://generativelanguage.googleapis.com/'));
        assert.ok(!String(url).includes(process.env.GEMINI_API_KEY));
        assert.equal(options.headers['x-goog-api-key'], process.env.GEMINI_API_KEY);
        assert.ok(options.signal);
        const body = JSON.parse(options.body);
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        assert.equal(body.tools, undefined);
        assert.ok(!options.body.includes(process.env.GEMINI_API_KEY));
        assert.match(body.systemInstruction.parts[0].text, /Ngân sách thấp/);
        assert.match(body.systemInstruction.parts[0].text, /không chẩn đoán/i);
        assert.match(body.systemInstruction.parts[0].text, /food_guidance/);
        return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ scope: 'STORE', answer: 'Chào bạn', recommendations: [] }) }] } }] });
    };
    assert.equal((await gemini.generateReply({ catalog: [], history: [] })).answer, 'Chào bạn');
    process.env.GEMINI_ENABLED = 'false';
    assert.equal(gemini.isEnabled(), false);
});

test('Gemini từ chối HTTP lỗi, phản hồi bị cắt, JSON/schema sai', async () => {
    global.fetch = async () => Response.json({}, { status: 429 });
    await assert.rejects(gemini.generateReply({}), /GEMINI_HTTP_429/);
    global.fetch = async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] });
    await assert.rejects(gemini.generateReply({}), /GEMINI_INCOMPLETE_REPLY/);
    global.fetch = async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] });
    await assert.rejects(gemini.generateReply({}), /GEMINI_INVALID_REPLY/);
    global.fetch = async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ scope: 'STORE', answer: 'Chào', recommendations: [null] }) }] } }] });
    await assert.rejects(gemini.generateReply({}), /GEMINI_INVALID_REPLY/);
    process.env.GEMINI_MODEL = '../invalid';
    await assert.rejects(gemini.generateReply({}), /GEMINI_INVALID_MODEL/);
});
