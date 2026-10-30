const FILE_KEY = 'AVHxdgKfgepM7o7kBjah5d';
const CUSTOMER_IDS = [
    ['C01', '2:2', '51:2'], ['C02', '3:2', '52:2'], ['C03', '8:2', '53:2'],
    ['C04', '7:2', '54:2'], ['C05', '6:2', '57:2'], ['C06', '19:2', '63:2'],
    ['C07', '18:2', '61:2'], ['C08', '17:2', '58:2'], ['C09', '16:2', '59:2'],
    ['C10', '11:2', '62:2'], ['C11', '10:2', '60:2'], ['C12', '9:2', '68:2'],
    ['C13', '15:2', '64:2'], ['C14', '14:2', '65:2'], ['C15', '13:2', '66:2'],
    ['C16', '12:2', '67:2']
];
const REPAIR_KEYS = ['C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C13', 'C14'];

function walk(nodes, callback) {
    for (const node of nodes) { callback(node); walk(node.children || [], callback); }
}

function solid(color) {
    return { type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a };
}

function fontKey(font) { return [font.family, font.weight, font.italic].join('|'); }

async function prepareFonts(api, data, pairs) {
    const available = await api.listAvailableFontsAsync();
    const required = new Map();
    for (const screen of data.screens) walk(screen.tree, (node) => {
        if (node.type === 'text') required.set(fontKey(node.font), node.font);
    });
    const resolved = new Map();
    const styleNames = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'regular',
        500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };
    for (const [key, font] of required) {
        const expectedStyle = font.italic ? (font.weight === 400 ? 'italic' : styleNames[font.weight] + 'italic') : styleNames[font.weight];
        const found = available.find(({ fontName }) => fontName.family === font.family &&
            fontName.style.toLowerCase().replace(/[^a-z]/g, '') === expectedStyle)?.fontName;
        if (!found) throw new Error('Figma thiếu font ' + font.family + ', độ đậm ' + font.weight + '. Chưa thay đổi màn hình cũ.');
        resolved.set(key, found);
    }
    const toLoad = new Map([...resolved.values()].map((font) => [font.family + '|' + font.style, font]));
    for (const pair of pairs) for (const frame of [pair.desktop, pair.mobile]) {
        for (const text of frame.findAllWithCriteria({ types: ['TEXT'] })) {
            for (const segment of text.getStyledTextSegments(['fontName'])) {
                const font = segment.fontName;
                toLoad.set(font.family + '|' + font.style, font);
            }
        }
    }
    // Nhãn hàng cũng có thể được di chuyển khi căn lại section khách hàng.
    const section = pairs[0].desktop.parent;
    if (section?.type === 'SECTION') for (const node of section.children.filter((node) => node.type === 'TEXT')) {
        for (const segment of node.getStyledTextSegments(['fontName'])) {
            const font = segment.fontName;
            toLoad.set(font.family + '|' + font.style, font);
        }
    }
    await Promise.all([...toLoad.values()].map((font) => api.loadFontAsync(font)));
    return resolved;
}

function gradientPaint(gradient) {
    const radians = gradient.angle * Math.PI / 180;
    const dx = Math.sin(radians), dy = -Math.cos(radians);
    const length = Math.abs(dx) + Math.abs(dy);
    return { type: 'GRADIENT_LINEAR', gradientStops: gradient.stops,
        gradientTransform: [[dx / length, dy / length, 0.5 - (dx + dy) / (2 * length)],
            [-dy, dx, 0.5 + (dy - dx) / 2]] };
}

function renderNode(api, source, parent, origin, fonts, images) {
    let node;
    if (source.type === 'text') {
        node = api.createText();
        node.fontName = fonts.get(fontKey(source.font));
        node.fontSize = source.font.size;
        node.lineHeight = { unit: 'PIXELS', value: source.font.lineHeight };
        node.letterSpacing = { unit: 'PIXELS', value: source.font.letterSpacing };
        node.textDecoration = source.font.decoration || 'NONE';
        node.characters = source.text;
        node.textAutoResize = 'WIDTH_AND_HEIGHT';
        node.fills = [solid(source.font.color)];
        node.name = source.text.slice(0, 80);
    } else if (source.type === 'svg') {
        node = api.createNodeFromSvg(source.markup);
        node.resizeWithoutConstraints(source.width, source.height);
        node.name = source.name;
    } else {
        node = api.createFrame();
        node.layoutMode = 'NONE';
        node.resizeWithoutConstraints(source.width, source.height);
        node.clipsContent = source.clip;
        node.opacity = source.opacity;
        node.name = source.name;
        const fills = source.background.a ? [solid(source.background)] : [];
        if (source.image) fills.push({ type: 'IMAGE', scaleMode: source.imageMode, imageHash: images.get(source.image) });
        if (source.gradient) fills.push(gradientPaint(source.gradient));
        node.fills = fills;
        const radius = source.radius.map((value) => Math.min(value, source.width / 2, source.height / 2));
        [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius] = radius;
        const border = source.borders.find((edge) => edge.width > 0 && edge.color.a > 0);
        node.strokes = border ? [solid(border.color)] : [];
        node.strokeAlign = 'INSIDE';
        [node.strokeTopWeight, node.strokeRightWeight, node.strokeBottomWeight, node.strokeLeftWeight] = source.borders.map((edge) => edge.width);
    }
    parent.appendChild(node);
    node.x = source.x - origin.x;
    node.y = source.y - origin.y;
    for (const child of source.children || []) renderNode(api, child, node, source, fonts, images);
    return node;
}

async function inspect(api, data) {
    if (api.fileKey && api.fileKey !== FILE_KEY) throw new Error('Hãy mở đúng file Agri-Mart cũ trước khi chạy.');
    const keys = data.screens?.map((screen) => screen.key).sort();
    if (!keys || JSON.stringify(keys) !== JSON.stringify([...REPAIR_KEYS].sort())) throw new Error('Gói phải chứa đủ 10 màn hình cần sửa.');
    for (const screen of data.screens) {
        const expectedId = CUSTOMER_IDS.find(([key]) => key === screen.key)[1];
        if (screen.id !== expectedId || screen.width !== 1440 || screen.viewport.width !== 1440 || !screen.viewport.desktop ||
            screen.viewport.documentWidth !== 1440 || !(screen.height > 0) || !screen.tree?.length || screen.sourceRuntimeErrors.length) {
            throw new Error('Nguồn desktop không hợp lệ: ' + screen.key);
        }
        walk(screen.tree, (node) => {
            if (!['frame', 'text', 'svg'].includes(node.type) || ![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height <= 0) {
                throw new Error('Layer nguồn không hợp lệ: ' + screen.key);
            }
            if (node.image && !data.assets[node.image]) throw new Error('Thiếu ảnh của ' + screen.key);
        });
    }
    const pairs = [];
    const used = new Set();
    for (const [key, desktopId, mobileId] of CUSTOMER_IDS) {
        const desktop = await api.getNodeByIdAsync(desktopId), mobile = await api.getNodeByIdAsync(mobileId);
        if (desktop?.type !== 'FRAME' || mobile?.type !== 'FRAME') throw new Error('Không tìm thấy cặp ' + key + '. Chưa sửa màn hình nào.');
        for (const node of [desktop, mobile]) {
            if (used.has(node.id)) throw new Error('ID frame bị trùng.');
            used.add(node.id);
        }
        pairs.push({ key, desktop, mobile });
    }
    return pairs;
}

function arrangeCustomers(api, page, pairs) {
    let section = pairs[0].desktop.parent;
    if (section?.type !== 'SECTION' || !pairs.every((pair) => pair.desktop.parent === section && pair.mobile.parent === section)) {
        const existing = page.children.find((node) => node.type === 'SECTION' && node.name === 'Agri-Mart / 03 · Khách hàng');
        section = existing || api.createSection();
        if (!existing) {
            section.name = 'Agri-Mart / 03 · Khách hàng';
            section.x = 200;
            section.y = Math.max(0, ...page.children.filter((node) => node !== section && node.visible !== false).map((node) => node.y + node.height)) + 350;
        }
    }
    const x = section.x, y = section.y;
    const desktopHeight = Math.max(...pairs.map((pair) => pair.desktop.height));
    const mobileHeight = Math.max(...pairs.map((pair) => pair.mobile.height));
    const columnWidth = Math.max(...pairs.flatMap((pair) => [pair.desktop.width, pair.mobile.width]));
    const mobileY = 160 + desktopHeight + 200;
    section.resizeWithoutConstraints(pairs.length * (columnWidth + 160) + 80, mobileY + mobileHeight + 100);
    for (const pair of pairs) { section.appendChild(pair.desktop); section.appendChild(pair.mobile); }
    // Căn tọa độ sau khi đưa đủ frame vào section để tránh ảnh hưởng lúc đổi cha.
    pairs.forEach((pair, index) => {
        pair.desktop.x = 80 + index * (columnWidth + 160) + (columnWidth - pair.desktop.width) / 2;
        pair.desktop.y = 160;
        pair.mobile.x = 80 + index * (columnWidth + 160) + (columnWidth - pair.mobile.width) / 2;
        pair.mobile.y = mobileY;
    });
    for (const label of section.children.filter((node) => node.type === 'TEXT' && node.name.startsWith('Agri-Mart / Nhãn hàng / '))) {
        label.x = 80;
        label.y = label.name.endsWith('mobile') ? mobileY - 80 : 64;
    }
    section.resizeWithoutConstraints(pairs.length * (columnWidth + 160) + 80, mobileY + mobileHeight + 100);
    section.x = x; section.y = y;
    return section;
}

async function repair(api, data, progress = () => {}) {
    progress('Đang kiểm tra ID và font của file cũ...');
    const pairs = await inspect(api, data);
    const fonts = await prepareFonts(api, data, pairs);
    const page = await api.getNodeByIdAsync('0:1');
    if (page?.type !== 'PAGE') throw new Error('Không tìm thấy trang Agri-Mart.');
    await api.setCurrentPageAsync(page);
    const mobileBefore = pairs.map(({ mobile }) => ({ node: mobile, width: mobile.width, height: mobile.height, children: mobile.children.map((child) => child.id) }));
    const images = new Map(Object.entries(data.assets).map(([key, asset]) => [key, api.createImage(api.base64Decode(asset.base64)).hash]));
    const staging = api.createSection();
    staging.name = 'Agri-Mart / Đang chuẩn bị desktop 1440px';
    staging.x = Math.max(0, ...page.children.filter((node) => node !== staging).map((node) => node.x + node.width)) + 200;
    staging.y = 200;
    const prepared = [];
    try {
        for (let index = 0; index < data.screens.length; index++) {
            const screen = data.screens[index];
            progress('Đang dựng desktop ' + screen.key + ' · ' + (index + 1) + '/10...');
            const frame = api.createFrame();
            frame.name = screen.key + ' · Desktop đang chuẩn bị';
            frame.resizeWithoutConstraints(1440, screen.height);
            frame.fills = [solid({ r: 1, g: 1, b: 1, a: 1 })];
            staging.appendChild(frame);
            frame.x = index * 1600; frame.y = 0;
            for (const node of screen.tree) renderNode(api, node, frame, { x: 0, y: 0 }, fonts, images);
            let expectedText = 0;
            walk(screen.tree, (node) => { if (node.type === 'text') expectedText++; });
            if (frame.width !== 1440 || frame.findAllWithCriteria({ types: ['TEXT'] }).length < expectedText) throw new Error('Chưa dựng đủ layer của ' + screen.key);
            prepared.push({ screen, frame });
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    } catch (error) {
        staging.remove();
        throw new Error(error.message + ' Các màn hình cũ vẫn được giữ nguyên.');
    }
    // Chỉ thay nội dung sau khi đã dựng và kiểm tra đủ cả 10 desktop.
    const backup = api.createSection();
    backup.name = 'Agri-Mart / Sao lưu trước khi sửa desktop / ' + new Date().toISOString();
    backup.x = staging.x; backup.y = staging.y;
    const changed = [];
    for (const { screen, frame } of prepared) {
        const root = pairs.find((pair) => pair.key === screen.key).desktop;
        const old = api.createFrame();
        old.name = screen.key + ' · Bản trước khi sửa';
        old.resizeWithoutConstraints(root.width, root.height);
        old.fills = [...root.fills]; old.clipsContent = root.clipsContent;
        backup.appendChild(old); old.x = changed.length * 1700; old.y = 0;
        const children = root.children.map((node) => ({ node, x: node.x, y: node.y }));
        for (const child of children) { old.appendChild(child.node); child.node.x = child.x; child.node.y = child.y; }
        root.layoutMode = 'NONE';
        root.resizeWithoutConstraints(1440, screen.height);
        root.fills = [solid({ r: 1, g: 1, b: 1, a: 1 })];
        root.clipsContent = true;
        for (const child of [...frame.children]) root.appendChild(child);
        root.name = screen.key + ' · ' + screen.name + ' · Máy tính 1440px · v2';
        changed.push(root.id);
    }
    staging.remove();
    backup.visible = false;
    const section = arrangeCustomers(api, page, pairs);
    for (const pair of pairs) {
        if (pair.desktop.parent !== section || pair.mobile.parent !== section || pair.desktop.y !== 160 ||
            pair.mobile.y <= pair.desktop.y + pair.desktop.height ||
            Math.abs(pair.desktop.x + pair.desktop.width / 2 - pair.mobile.x - pair.mobile.width / 2) > 1) {
            throw new Error('Cần kiểm tra lại vị trí cặp ' + pair.key + '. Nội dung trước khi sửa vẫn có trong section sao lưu.');
        }
    }
    for (const before of mobileBefore) {
        if (before.node.width !== before.width || before.node.height !== before.height ||
            JSON.stringify(before.node.children.map((child) => child.id)) !== JSON.stringify(before.children)) throw new Error('Kiểm tra bản điện thoại chưa đạt: ' + before.node.id);
    }
    page.selection = changed.map((id) => pairs.find((pair) => pair.desktop.id === id).desktop);
    api.viewport.scrollAndZoomIntoView([pairs.find((pair) => pair.key === 'C03').desktop]);
    return { changedDesktopIds: changed, preservedMobileIds: pairs.map((pair) => pair.mobile.id),
        customerSectionId: section.id, backupSectionId: backup.id,
        widths: pairs.filter((pair) => REPAIR_KEYS.includes(pair.key)).map((pair) => ({ key: pair.key, width: pair.desktop.width, height: pair.desktop.height })) };
}

if (typeof module !== 'undefined') module.exports = { inspect, repair, gradientPaint, renderNode, CUSTOMER_IDS, REPAIR_KEYS };
else {
    figma.showUI(__html__, { width: 450, height: 480 });
    let running = false;
    figma.ui.onmessage = async (message) => {
        if (message.type !== 'repair' || running) return;
        running = true;
        try {
            const result = await repair(figma, message.data, (text) => figma.ui.postMessage({ type: 'progress', text }));
            figma.ui.postMessage({ type: 'done', text: 'Đã sửa đủ 10 desktop 1440px trong file cũ và giữ nguyên các bản điện thoại.', result });
        } catch (error) { figma.ui.postMessage({ type: 'error', text: error.message }); }
        finally { running = false; }
    };
}
