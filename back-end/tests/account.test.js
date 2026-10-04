const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateProfile, validateAddress, validateId } = require('../src/middlewares/account-validation.middleware');
const { createAddressService } = require('../src/services/address.services');
const { createUserService } = require('../src/services/user.services');

const auth = { id: '1', version: 3 };
const activeUser = { id: '1', status: 'ACTIVE', deleted_at: null, token_version: 3 };
const firstAddress = {
    id: '10', user_id: '1', recipient_name: 'Người nhận', recipient_phone: '0900000000',
    province_name: 'Tỉnh thử nghiệm', ward_name: 'Phường thử nghiệm', address_line: 'Số 10',
    is_default: 1, created_at: '2026-10-04 05:00:00.000', updated_at: '2026-10-04 05:00:00.000'
};

const validInput = {
    recipientName: 'Người nhận', recipientPhone: '0900000000',
    provinceName: 'Tỉnh thử nghiệm', wardName: 'Phường thử nghiệm', addressLine: 'Số 10'
};

const harness = (steps) => {
    const queue = [...steps];
    const events = [];

    const execute = async (sql, values = []) => {
        const step = queue.shift();
        assert.ok(step, `Unexpected query: ${sql}`);
        assert.match(sql, step.match);

        if (step.values) {
            step.values(values);
        }

        if (step.error) {
            throw step.error;
        }

        return [step.result ?? { affectedRows: 1 }, []];
    };

    const connection = {
        execute,
        beginTransaction: async () => events.push('begin'),
        commit: async () => events.push('commit'),
        rollback: async () => events.push('rollback'),
        release: () => events.push('release')
    };

    const db = { execute, getConnection: async () => connection };

    return {
        addresses: createAddressService(db),
        users: createUserService(db),
        events,
        done: () => assert.equal(queue.length, 0)
    };
};

const lock = () => ({
    match: /FROM users[\s\S]*FOR UPDATE/,
    values: (values) => assert.deepEqual(values, ['1']),
    result: [activeUser]
});

const owned = (rows = [firstAddress]) => ({
    match: /WHERE id = \? AND user_id = \? AND deleted_at IS NULL[\s\S]*FOR UPDATE/,
    values: (values) => assert.deepEqual(values, ['10', '1']),
    result: rows
});

test('profile rejects privilege, email and password mass assignment', () => {
    for (const field of ['role', 'status', 'email', 'password', 'userId', 'avatarFileId']) {
        assert.throws(() => validateProfile({ [field]: 'value' }), { code: 'VALIDATION_FAILED' });
    }
});

test('profile patch distinguishes omitted fields from explicit null', () => {
    assert.deepEqual(validateProfile({ phone: null, birthday: null }), { phone: null, birthday: null });
    assert.deepEqual(validateProfile({ fullName: ' Demo ' }), { fullName: 'Demo' });
    assert.throws(() => validateProfile({}));
    assert.throws(() => validateProfile({ fullName: null }));
});

test('birthday rejects impossible/future dates and keeps date-only', () => {
    assert.equal(validateProfile({ birthday: '2000-02-29' }).birthday, '2000-02-29');
    for (const birthday of ['2001-02-29', '2000-13-01', '3000-01-01', '04/10/2000']) {
        assert.throws(() => validateProfile({ birthday }));
    }
});

test('address validates required fields, coordinates and default flag', () => {
    assert.deepEqual(validateAddress(validInput, true), validInput);
    assert.throws(() => validateAddress({ ...validInput, recipientName: '' }, true));
    assert.throws(() => validateAddress({ ...validInput, isDefault: 'true' }, true));
    assert.throws(() => validateAddress({ ...validInput, latitude: 21 }, true));
    assert.throws(() => validateAddress({ latitude: 91, longitude: 105 }, false));
    assert.throws(() => validateAddress({ latitude: null, longitude: 105 }, false));
    assert.deepEqual(validateAddress({ latitude: null, longitude: null }, false), { latitude: null, longitude: null });
    assert.equal(validateAddress({ latitude: 21, longitude: 105 }, false).latitude, '21.0000000');
});

test('address rejects user ID and default mutation on generic PATCH', () => {
    assert.throws(() => validateAddress({ userId: '2' }, false));
    assert.throws(() => validateAddress({ isDefault: false }, false));
    assert.throws(() => validateAddress({}, false));
});

test('BIGINT IDs stay exact and reject SQL-like input', () => {
    assert.equal(validateId('18446744073709551615'), '18446744073709551615');
    for (const value of ['18446744073709551616', '0', '-1', '1 OR 1=1', '01']) {
        assert.throws(() => validateId(value));
    }
});

test('cross-user address read returns 404', async () => {
    const h = harness([lock(), owned([])]);
    await assert.rejects(h.addresses.getAddress(auth, '10'), { code: 'RESOURCE_NOT_FOUND' });
    assert.deepEqual(h.events, ['begin', 'rollback', 'release']);
    h.done();
});

test('cross-user update performs no write', async () => {
    const h = harness([lock(), owned([])]);
    await assert.rejects(h.addresses.updateAddress(auth, '10', { label: 'Work' }), { code: 'RESOURCE_NOT_FOUND' });
    h.done();
});

test('cross-user delete performs no write', async () => {
    const h = harness([lock(), owned([])]);
    await assert.rejects(h.addresses.deleteAddress(auth, '10'), { code: 'RESOURCE_NOT_FOUND' });
    h.done();
});

test('first address becomes default even when client passes false', async () => {
    const h = harness([
        lock(),
        { match: /SELECT id, is_default/, result: [] },
        { match: /SET is_default = 0/, values: (values) => assert.deepEqual(values, ['1']) },
        { match: /INSERT INTO user_addresses/, values: (values) => assert.equal(values.at(-1), 1), result: { insertId: '10' } },
        owned()
    ]);
    const result = await h.addresses.createAddress(auth, { ...validInput, isDefault: false });
    assert.equal(result.isDefault, true);
    assert.deepEqual(h.events, ['begin', 'commit', 'release']);
    h.done();
});

test('second nondefault address leaves current default unchanged', async () => {
    const h = harness([
        lock(),
        { match: /SELECT id, is_default/, result: [{ id: '9', is_default: 1 }] },
        { match: /INSERT INTO user_addresses/, values: (values) => assert.equal(values.at(-1), 0), result: { insertId: '10' } },
        owned([{ ...firstAddress, is_default: 0 }])
    ]);
    assert.equal((await h.addresses.createAddress(auth, validInput)).isDefault, false);
    h.done();
});

test('default switch clears old before setting new', async () => {
    const h = harness([
        lock(), owned([{ ...firstAddress, is_default: 0 }]),
        { match: /SET is_default = 0/ },
        { match: /SET is_default = 1/, values: (values) => assert.deepEqual(values, ['10', '1']) },
        owned()
    ]);
    assert.equal((await h.addresses.setDefaultAddress(auth, '10')).isDefault, true);
    h.done();
});

test('setting current default is idempotent', async () => {
    const h = harness([lock(), owned(), owned()]);
    await h.addresses.setDefaultAddress(auth, '10');
    h.done();
});

test('deleting default softly promotes oldest remaining address', async () => {
    const h = harness([
        lock(), owned(),
        { match: /SET deleted_at = UTC_TIMESTAMP\(3\), is_default = 0/ },
        { match: /ORDER BY id ASC LIMIT 1 FOR UPDATE/, result: [{ id: '11' }] },
        { match: /SET is_default = 1/, values: (values) => assert.deepEqual(values, ['11', '1']) }
    ]);
    assert.deepEqual(await h.addresses.deleteAddress(auth, '10'), { deletedId: '10', defaultAddressId: '11' });
    h.done();
});

test('deleting last address returns null default', async () => {
    const h = harness([lock(), owned(), { match: /SET deleted_at/ }, { match: /LIMIT 1 FOR UPDATE/, result: [] }]);
    assert.equal((await h.addresses.deleteAddress(auth, '10')).defaultAddressId, null);
    h.done();
});

test('write failure rolls back rather than losing old default', async () => {
    const h = harness([
        lock(), owned([{ ...firstAddress, is_default: 0 }]),
        { match: /SET is_default = 0/ },
        { match: /SET is_default = 1/, error: new Error('write failed') }
    ]);
    await assert.rejects(h.addresses.setDefaultAddress(auth, '10'), /write failed/);
    assert.deepEqual(h.events, ['begin', 'rollback', 'release']);
    h.done();
});

test('revoked token is rechecked inside write transaction', async () => {
    const h = harness([{ match: /FROM users[\s\S]*FOR UPDATE/, result: [{ ...activeUser, token_version: 4 }] }]);
    await assert.rejects(h.addresses.createAddress(auth, validInput), { code: 'UNAUTHORIZED' });
    h.done();
});

test('limit check prevents creating more than 20 active addresses', async () => {
    const h = harness([lock(), { match: /SELECT id, is_default/, result: Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), is_default: i === 0 ? 1 : 0 })) }]);
    await assert.rejects(h.addresses.createAddress(auth, validInput), { code: 'ADDRESS_LIMIT_REACHED' });
    h.done();
});

test('profile updates only whitelisted fields and returns no password', async () => {
    const h = harness([
        lock(),
        { match: /UPDATE users SET `full_name` = \?, `phone` = \? WHERE id = \?/, values: (values) => assert.deepEqual(values, ['Demo', null, '1']) },
        { match: /JOIN roles/, result: [{ ...activeUser, full_name: 'Demo', phone: null, role_code: 'customer', password_hash: 'should not escape', birthday: '2000-01-01' }] }
    ]);
    const result = await h.users.updateProfile(auth, { fullName: 'Demo', phone: null });
    assert.equal(result.fullName, 'Demo');
    assert.equal(result.birthday, '2000-01-01');
    assert.equal(result.password_hash, undefined);
    h.done();
});
