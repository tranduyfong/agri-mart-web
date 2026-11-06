// Gemini giả chỉ dùng trong kiểm thử; không gửi nội dung hoặc key ra Google.
process.env.GEMINI_ENABLED = 'true';
process.env.GEMINI_API_KEY = 'ai-integration-fake-key';
require('../src/configs/mailer.config').sendMail = async () => ({ accepted: [], rejected: [] });
require('../src/configs/gemini.config').generateReply = async ({ catalog, history, shopping_request, food_guidance, feedback }) => {
    const text = history.at(-1).text;
    console.log('AI_TEST_CALL:' + text);
    if (text.includes('AI_SLOW')) await new Promise((resolve) => setTimeout(resolve, 900));
    if (text.includes('AI_ERROR')) throw new Error('GEMINI_HTTP_429');
    if (text.includes('AI_OFF_TOPIC')) return { scope: 'OFF_TOPIC', answer: 'Nội dung ngoài cửa hàng không được hiển thị', recommendations: [] };
    if (text.includes('AI_FAKE')) return { scope: 'STORE', answer: 'Sản phẩm bịa không được hiển thị', recommendations: [{ variant_id: '000000000000000000000001', quantity: 1 }] };
    if (text.includes('AI_BAD_QUANTITY')) return { scope: 'STORE', answer: 'Không hiển thị số lượng sai', recommendations: [{ variant_id: catalog[0].variant_id, quantity: catalog[0].step_quantity / 2 }] };
    if (text.includes('AI_SHOP_HANDOFF')) return { scope: 'HANDOFF', answer: 'Không cần đưa khách hỏi món ăn sang nhân viên', recommendations: [] };
    if (text.includes('AI_OVER_BUDGET')) return { scope: 'STORE', answer: 'Bữa này vừa ngân sách (câu sai phải bị chặn)',
        recommendations: [{ variant_id: catalog[0].variant_id, quantity: 15 }] };
    if (text.includes('AI_WARM')) {
        const meat = catalog.find(item => item.name.includes('Thịt'));
        const vegetable = catalog.find(item => item.name.includes('Rau'));
        if (shopping_request?.budget === 50000) return { scope: 'STORE', recommendations: [],
            answer: 'Mình hiểu bạn cần cả thịt và rau cho 3 người. Quy cách thịt hiện có chưa vừa ngân sách 50.000đ. Bạn có sẵn nguyên liệu nào để mình cân đối thêm không?' };
        return { scope: 'STORE', answer: food_guidance?.length
            ? 'Mình hiểu bạn muốn chăm bữa ăn cho người tiểu đường. Nên ưu tiên rau ít tinh bột và đạm phù hợp; mình gợi ý cách hấp hoặc luộc, bạn có kiêng gì theo hướng dẫn bác sĩ không?'
            : 'Mình hiểu bạn muốn bữa cơm đơn giản, có cả rau và thịt. Mình chọn cách nấu dễ và cân đối ngân sách cho bạn.',
            recommendations: [vegetable, meat].filter(Boolean).map(item => ({ variant_id: item.variant_id, quantity: item.step_quantity })) };
    }
    return { scope: 'STORE', answer: 'Mình có thể giúp bạn tìm sản phẩm phù hợp.',
        recommendations: catalog.filter((item, index) => catalog.findIndex((other) => other.product_id === item.product_id) === index)
            .slice(0, 2).map((item) => ({ variant_id: item.variant_id, quantity: item.step_quantity })) };
};
require('../src/index');
