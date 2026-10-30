const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { inspect, repair, gradientPaint, CUSTOMER_IDS, REPAIR_KEYS } = require('./code.js');
const source = JSON.parse(fs.readFileSync(__dirname + '/layouts.json', 'utf8'));

function fixture() {
    const nodes = new Map();
    const loaded = new Set();
    let next = 1000, failSvg = false;
    function node(type, id = String(next++), width = 390, height = 900) {
        const result = { type, id, name: id, x: 0, y: 0, width, height, children: [], parent: null,
            fills: [], clipsContent: false, layoutMode: 'NONE', visible: true,
            appendChild(child) {
                if (child.parent) child.parent.children = child.parent.children.filter((entry) => entry !== child);
                child.parent = this; this.children.push(child);
            },
            resizeWithoutConstraints(w, h) {
                assert.ok(Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0);
                this.width = w; this.height = h;
            },
            remove() {
                for (const child of [...this.children]) child.remove();
                if (this.parent) this.parent.children = this.parent.children.filter((entry) => entry !== this);
                nodes.delete(this.id); this.removed = true;
            },
            findAllWithCriteria({ types }) {
                return this.children.flatMap((child) => [...(types.includes(child.type) ? [child] : []), ...child.findAllWithCriteria({ types })]);
            },
            getStyledTextSegments() { return [{ fontName: this.fontName || { family: 'Be Vietnam Pro', style: 'Regular' } }]; }
        };
        if (type === 'TEXT') {
            let text = '';
            Object.defineProperty(result, 'characters', { get: () => text, set(value) {
                assert.ok(loaded.has(result.fontName.family + '|' + result.fontName.style), 'Font phải được tải trước khi ghi chữ');
                text = value;
            } });
        }
        for (const property of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) {
            Object.defineProperty(result, property, { set(value) { assert.ok(Number.isFinite(value) && value >= 0 && value <= Math.min(this.width, this.height) / 2); } });
        }
        nodes.set(id, result); return result;
    }
    const page = node('PAGE', '0:1');
    const section = node('SECTION', 'customer-section', 25000, 4000);
    section.name = 'Agri-Mart / 03 · Khách hàng'; section.x = 200; section.y = 5000; page.appendChild(section);
    for (const [key, desktopId, mobileId] of CUSTOMER_IDS) {
        const desktop = node('FRAME', desktopId, REPAIR_KEYS.includes(key) ? 390 : 1440, 1700);
        desktop.name = key + ' · Máy tính';
        const old = node('TEXT', key + '-old');
        desktop.appendChild(old);
        const mobile = node('FRAME', mobileId, 390, 2200);
        mobile.appendChild(node('TEXT', key + '-mobile-text'));
        section.appendChild(desktop); section.appendChild(mobile);
    }
    const staff = node('FRAME', 'staff-screen', 1440, 1000); staff.x = 123; staff.y = 456; page.appendChild(staff);
    const api = { fileKey: source.fileKey, currentPage: page,
        getNodeByIdAsync: async (id) => nodes.get(id) || null,
        setCurrentPageAsync: async (target) => { api.currentPage = target; },
        listAvailableFontsAsync: async () => ['Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black'].map((style) => ({ fontName: { family: 'Be Vietnam Pro', style } })),
        loadFontAsync: async (font) => loaded.add(font.family + '|' + font.style),
        createFrame: () => { const result = node('FRAME'); page.appendChild(result); return result; },
        createSection: () => { const result = node('SECTION'); page.appendChild(result); return result; },
        createText: () => { const result = node('TEXT'); page.appendChild(result); return result; },
        createNodeFromSvg: (svg) => {
            if (failSvg) throw Error('SVG test failure');
            assert.ok(svg.includes('<svg') && svg.includes('http://www.w3.org/2000/svg'));
            const result = node('FRAME'); page.appendChild(result); return result;
        },
        base64Decode: (value) => new Uint8Array(Buffer.from(value, 'base64')),
        createImage: (bytes) => { assert.ok(bytes.length > 0); return { hash: 'image-' + bytes.length }; },
        viewport: { scrollAndZoomIntoView: () => {} }
    };
    return { api, nodes, page, section, staff, failSvg: () => { failSvg = true; } };
}

test('Sửa đủ 10 desktop 1440px trong đúng ID; giữ nội dung điện thoại, nhân viên và bản sao lưu', async () => {
    const f = fixture();
    const beforeMobile = CUSTOMER_IDS.map(([, , id]) => ({ node: f.nodes.get(id), children: [...f.nodes.get(id).children] }));
    const untouched = CUSTOMER_IDS.filter(([key]) => !REPAIR_KEYS.includes(key)).map(([, id]) => ({ node: f.nodes.get(id), children: [...f.nodes.get(id).children] }));
    const result = await repair(f.api, source);
    assert.equal(result.changedDesktopIds.length, 10);
    assert.equal(result.preservedMobileIds.length, 16);
    const backup = f.nodes.get(result.backupSectionId);
    assert.equal(backup.visible, false);
    assert.equal(backup.children.length, 10);
    for (const screen of source.screens) {
        const frame = f.nodes.get(screen.id);
        assert.equal(frame.width, 1440); assert.equal(frame.height, screen.height);
        assert.ok(frame.name.includes('Máy tính 1440px'));
        assert.ok(frame.findAllWithCriteria({ types: ['TEXT'] }).length > 20);
        assert.ok(f.nodes.get(screen.key + '-old').parent.name.includes('Bản trước khi sửa'));
    }
    for (const entry of [...beforeMobile, ...untouched]) assert.deepEqual(entry.node.children, entry.children);
    for (const entry of beforeMobile) { assert.equal(entry.node.width, 390); assert.equal(entry.node.height, 2200); }
    for (const [, desktopId, mobileId] of CUSTOMER_IDS) {
        const desktop = f.nodes.get(desktopId), mobile = f.nodes.get(mobileId);
        assert.equal(desktop.parent, mobile.parent);
        assert.equal(desktop.x + desktop.width / 2, mobile.x + mobile.width / 2);
        assert.equal(desktop.y, 160); assert.ok(mobile.y > desktop.y + desktop.height);
        assert.ok(mobile.y + mobile.height <= mobile.parent.height);
    }
    assert.equal(f.staff.x, 123); assert.equal(f.staff.y, 456);
    assert.equal(f.nodes.get('customer-section').x, 200);
    assert.equal(f.nodes.get('customer-section').y, 5000);
    assert.ok(![...f.nodes.values()].some((node) => node.name.includes('Đang chuẩn bị desktop')));
});

for (const scenario of ['sai file', 'thiếu frame', 'nguồn mobile', 'sai ID nguồn', 'thiếu ảnh', 'thiếu font']) {
    test('Dừng trước khi thay đổi frame cũ khi ' + scenario, async () => {
        const f = fixture(), data = structuredClone(source);
        if (scenario === 'sai file') f.api.fileKey = 'another-file';
        if (scenario === 'thiếu frame') f.nodes.delete('8:2');
        if (scenario === 'nguồn mobile') data.screens[0].viewport.desktop = false;
        if (scenario === 'sai ID nguồn') data.screens[0].id = '53:2';
        if (scenario === 'thiếu ảnh') delete data.assets[Object.keys(data.assets)[0]];
        if (scenario === 'thiếu font') f.api.listAvailableFontsAsync = async () => [];
        const size = f.nodes.size;
        await assert.rejects(repair(f.api, data));
        assert.equal(f.nodes.size, size);
        for (const [key, id] of CUSTOMER_IDS) if (f.nodes.has(id)) {
            assert.equal(f.nodes.get(id).children[0].id, key + '-old');
            if (REPAIR_KEYS.includes(key)) assert.equal(f.nodes.get(id).width, 390);
        }
    });
}

test('Dựng SVG thất bại thì xóa phần chuẩn bị, giữ nguyên tất cả frame gốc', async () => {
    const f = fixture(), size = f.nodes.size;
    f.failSvg();
    await assert.rejects(repair(f.api, source), /Các màn hình cũ vẫn được giữ nguyên/);
    assert.equal(f.nodes.size, size);
    for (const [key, id] of CUSTOMER_IDS) assert.equal(f.nodes.get(id).children[0].id, key + '-old');
});

test('Nguồn có đủ 10 trang desktop đúng viewport, không có lỗi runtime hoặc thông tin đăng nhập', async () => {
    const f = fixture();
    assert.equal((await inspect(f.api, source)).length, 16);
    for (const screen of source.screens) {
        assert.equal(screen.width, 1440); assert.equal(screen.viewport.documentWidth, 1440);
        assert.deepEqual(screen.sourceRuntimeErrors, []);
    }
    assert.ok(!JSON.stringify(source).includes('eyJhbGci'));
});

test('Gradient chuyển sang Paint Figma với RGBA và ma trận hữu hạn', () => {
    const color = { r: 0, g: 0, b: 0, a: .8 };
    for (const angle of [0, 90, 180, 270, 45]) {
        const paint = gradientPaint({ angle, stops: [{ position: 0, color }, { position: 1, color: { ...color, a: 0 } }] });
        assert.equal(paint.type, 'GRADIENT_LINEAR');
        assert.ok(paint.gradientTransform.flat().every(Number.isFinite));
        assert.equal(paint.gradientStops[0].color.a, .8);
    }
});
