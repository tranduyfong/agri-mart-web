// Gemini giả chỉ dùng trong kiểm thử; không gửi nội dung hoặc key ra Google.
process.env.GEMINI_ENABLED = 'true';
process.env.GEMINI_API_KEY = 'ai-integration-fake-key';
require('../src/configs/mailer.config').sendMail = async () => ({ accepted: [], rejected: [] });
require('../src/configs/gemini.config').generateReply = async ({ catalog, history }) => {
    const text = history.at(-1).text;
    console.log('AI_TEST_CALL:' + text);
    if (text.includes('AI_SLOW')) await new Promise((resolve) => setTimeout(resolve, 900));
    if (text.includes('AI_ERROR')) throw new Error('GEMINI_HTTP_429');
    if (text.includes('AI_OFF_TOPIC')) return { scope: 'OFF_TOPIC', answer: 'Nội dung ngoài cửa hàng không được hiển thị', recommendations: [] };
    if (text.includes('AI_FAKE')) return { scope: 'STORE', answer: 'Sản phẩm bịa không được hiển thị', recommendations: [{ variant_id: '000000000000000000000001', quantity: 1 }] };
    if (text.includes('AI_BAD_QUANTITY')) return { scope: 'STORE', answer: 'Không hiển thị số lượng sai', recommendations: [{ variant_id: catalog[0].variant_id, quantity: catalog[0].step_quantity / 2 }] };
    return { scope: 'STORE', answer: 'Mình có thể giúp bạn tìm sản phẩm phù hợp.',
        recommendations: catalog.filter((item, index) => catalog.findIndex((other) => other.product_id === item.product_id) === index)
            .slice(0, 2).map((item) => ({ variant_id: item.variant_id, quantity: item.step_quantity })) };
};
require('../src/index');
