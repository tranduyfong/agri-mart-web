const { normalizeSearch } = require('./string.util');

// Tư vấn chọn thực phẩm ở mức phổ thông, không chẩn đoán hoặc đặt chế độ điều trị cá nhân.
// Nguồn chính thống, đối chiếu 05/11/2026. Các URL cũng được gửi cho AI để nêu nguồn khi cần.
const guides = [
    { matches: /\b(tieu duong|dai thao duong)\b/, name: 'Đái tháo đường',
        explanation: 'Đường huyết cần được kiểm soát; lượng và cách phối hợp carbohydrate trong bữa ăn có vai trò quan trọng.',
        advice: 'Ưu tiên rau không chứa nhiều tinh bột và nguồn đạm nạc; cân đối carbohydrate, hạn chế đồ uống thêm đường. Không bảo kiêng toàn bộ cơm hoặc trái cây. Hỏi thêm chế độ bác sĩ đã hướng dẫn và dị ứng; không khẳng định một khẩu phần phù hợp cho mọi người.',
        source: 'https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html' },
    { matches: /\b(huyet ap cao|cao huyet ap|tang huyet ap)\b/, name: 'Tăng huyết áp',
        explanation: 'Lựa chọn thực phẩm và giảm natri có thể hỗ trợ kiểm soát huyết áp.',
        advice: 'Ưu tiên thực phẩm tươi, rau quả, đạm phù hợp; hạn chế thực phẩm chế biến nhiều muối. Chỉ nói ít muối theo cách chế biến, không bịa hàm lượng natri hoặc chứng nhận của sản phẩm.',
        source: 'https://www.nhlbi.nih.gov/health/dash-eating-plan' },
    { matches: /\b(gout|gut|axit uric|acid uric)\b/, name: 'Gout / tăng acid uric',
        explanation: 'Gout liên quan tích tụ tinh thể urat; chế độ ăn chỉ là một phần trong quản lý bệnh.',
        advice: 'Thảo luận hạn chế thực phẩm giàu purin như nội tạng, lượng lớn thịt đỏ và một số hải sản; tránh gợi ý bia/rượu hoặc đồ uống nhiều đường. Không hứa chữa gout bằng thực phẩm, không đưa lệnh cấm mọi loại đạm.',
        avoid: /\b(noi tang|gan heo|gan bo|long heo|bia|ruou)\b/,
        source: 'https://www.niams.nih.gov/health-topics/gout' },
    { matches: /\b(benh than|suy than|chay than|loc mau)\b/, name: 'Bệnh thận',
        explanation: 'Nhu cầu đạm, kali, phospho và nước khác nhau theo chức năng thận, xét nghiệm và việc lọc máu.',
        advice: 'Hỏi chế độ bác sĩ/chuyên gia dinh dưỡng đã chỉ định trước khi cá nhân hóa. Không tự mặc định ăn nhiều rau, tăng/giảm đạm, kiêng kali hay ấn định nước uống. Có thể hướng dẫn chọn thực phẩm tươi, nấu ít muối ở mức chung.',
        source: 'https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease' }
];

const getFoodGuidance = (history) => {
    const text = normalizeSearch(history.filter((item) => item.sender_type === 'CUSTOMER').map((item) => item.content).join('\n'));
    const selected = guides.filter((guide) => guide.matches.test(text));
    return {
        notes: selected.map(({ name, explanation, advice, source }) => ({ name, explanation, advice, source })),
        // Chỉ chặn tên thực phẩm rõ ràng; không suy diễn dinh dưỡng/độ an toàn từ tên thương mại.
        allows: (item) => !selected.some((guide) => guide.avoid?.test(normalizeSearch(item.name)))
    };
};

module.exports = { getFoodGuidance };
