const fs = require('node:fs');
const mongoose = require('mongoose');
const ChatRoom = require('../models/chatRoom');
const ChatMessage = require('../models/chatMessage');
const User = require('../models/user');
const { notifyChatChanged } = require('../utils/chatEvents.util');
const { deleteUploadedFiles } = require('../utils/file.util');
const chatAi = require('./chatAi.services');
const gemini = require('../configs/gemini.config');

const PAGE_SIZE = 50;
const incoming = (customer) => customer ? { $in: ['STAFF', 'AI'] } : 'CUSTOMER';
const unreadQuery = (userId, customer) => ({ sender_type: incoming(customer), read_by: { $ne: new mongoose.Types.ObjectId(userId) } });
const customerRoom = (userId) => ChatRoom.findOne({ customer_id: userId }).sort({ conversation_key: -1, updated_at: -1 });

const roomSummary = (room, unreadCount = 0, last = null) => ({
    id: room._id.toString(),
    customer_id: (room.customer_id?._id || room.customer_id)?.toString() || null,
    customer_name: room.customer_id?.full_name || 'Khách hàng',
    customer_avatar: room.customer_id?.avatar_url || null,
    status: room.status,
    waiting_for_staff: !!room.waiting_for_staff,
    ai_enabled: gemini.isEnabled(),
    ai_pending: gemini.isEnabled() && !!room.ai_pending,
    assigned_staff_id: (room.assigned_staff_id?._id || room.assigned_staff_id)?.toString() || null,
    staff_name: room.assigned_staff_id?.full_name || null,
    updated_at: room.updated_at,
    unread_count: unreadCount,
    last_message: last ? { content: last.content, sender_type: last.sender_type, has_images: !!last.attachments?.length, created_at: last.created_at } : null
});

const getRooms = async (status, userId, keyword = '') => {
    const query = {};
    if (status && ['AI_ACTIVE', 'STAFF_ACTIVE', 'CLOSED'].includes(status)) query.status = status;
    if (typeof keyword !== 'string' || keyword.length > 100) throw new Error('INVALID_DATA');
    if (keyword.trim()) {
        const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const customers = await User.find({ full_name: { $regex: escaped, $options: 'i' } }).select('_id').lean();
        query.customer_id = { $in: customers.map((user) => user._id) };
    }
    const rooms = await ChatRoom.find(query).populate('customer_id', 'full_name avatar_url')
        .populate('assigned_staff_id', 'full_name').sort({ updated_at: -1, _id: -1 }).limit(100).lean();
    const ids = rooms.map((room) => room._id);
    const [latest, unread] = await Promise.all([
        ChatMessage.aggregate([{ $match: { room_id: { $in: ids } } }, { $sort: { _id: -1 } }, { $group: { _id: '$room_id', message: { $first: '$$ROOT' } } }]),
        ChatMessage.aggregate([{ $match: { room_id: { $in: ids }, ...unreadQuery(userId, false) } }, { $group: { _id: '$room_id', count: { $sum: 1 } } }])
    ]);
    const lastByRoom = new Map(latest.map((entry) => [entry._id.toString(), entry.message]));
    const counts = new Map(unread.map((entry) => [entry._id.toString(), entry.count]));
    return rooms.map((room) => roomSummary(room, counts.get(room._id.toString()) || 0, lastByRoom.get(room._id.toString())));
};

const getRoom = async (id, userId, customer = false, before = '') => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    if (before && !mongoose.isObjectIdOrHexString(before)) throw new Error('INVALID_DATA');
    const room = await ChatRoom.findOne({ _id: id, ...(customer ? { customer_id: userId } : {}) })
        .populate('customer_id', 'full_name avatar_url').populate('assigned_staff_id', 'full_name').lean();
    if (!room) throw new Error('RESOURCE_NOT_FOUND');
    const [messages, unreadCount, last] = await Promise.all([
        ChatMessage.find({ room_id: id, ...(before ? { _id: { $lt: before } } : {}) }).sort({ _id: -1 }).limit(PAGE_SIZE + 1).populate('sender_id', 'full_name').lean(),
        ChatMessage.countDocuments({ room_id: id, ...unreadQuery(userId, customer) }),
        ChatMessage.findOne({ room_id: id }).sort({ _id: -1 }).lean()
    ]);
    const hasMore = messages.length > PAGE_SIZE;
    const page = messages.slice(0, PAGE_SIZE).reverse();
    const references = page.flatMap((message) => message.recommendations || []);
    const recommendations = references.length ? await chatAi.getRecommendations(references) : [];
    const recommendationsByMessage = new Map();
    let offset = 0;
    for (const message of page) {
        const count = (message.recommendations || []).length;
        recommendationsByMessage.set(String(message._id), recommendations.slice(offset, offset + count));
        offset += count;
    }
    return {
        ...roomSummary(room, unreadCount, last), has_more: hasMore,
        messages: page.map((message) => ({
            id: message._id.toString(), client_id: message.client_id || null,
            sender_id: (message.sender_id?._id || message.sender_id)?.toString() || null,
            sender_name: message.sender_id?.full_name || (message.sender_type === 'AI' ? 'Trợ lý' : 'Agri-Mart'),
            sender_type: message.sender_type, content: message.content, attachments: message.attachments || [], created_at: message.created_at,
            recommendations: recommendationsByMessage.get(String(message._id))
        }))
    };
};

const getCustomerRoom = async (userId, before) => {
    const room = await customerRoom(userId).lean();
    return room ? getRoom(room._id.toString(), userId, true, before) : null;
};

const getSummary = async (userId, customer = false) => {
    const room = customer ? await customerRoom(userId).lean() : null;
    if (customer && !room) return { unread_count: 0 };
    return { unread_count: await ChatMessage.countDocuments({ ...(room ? { room_id: room._id } : {}), ...unreadQuery(userId, customer) }) };
};

const claimRoom = async (userId, id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const room = await ChatRoom.findOneAndUpdate(
        { _id: id, $or: [{ status: 'AI_ACTIVE' }, { status: 'STAFF_ACTIVE', assigned_staff_id: userId }] },
        { $set: { status: 'STAFF_ACTIVE', assigned_staff_id: userId, ai_pending: false, ai_locked_until: null, waiting_for_staff: false } }, { new: true }
    );
    if (!room) throw new Error('ROOM_TAKEN');
    notifyChatChanged(room);
    return getRoom(id, userId);
};

const checkMessage = (content, files, clientId) => {
    if (typeof content !== 'string' || content.length > 5000 || files.length > 3 || (!content.trim() && !files.length)) throw new Error('INVALID_DATA');
    if (clientId != null && (typeof clientId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(clientId))) throw new Error('INVALID_DATA');
    for (const file of files) {
        const header = Buffer.alloc(12);
        const descriptor = fs.openSync(file.path, 'r');
        try { fs.readSync(descriptor, header, 0, 12, 0); } finally { fs.closeSync(descriptor); }
        const type = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
            : header[0] === 255 && header[1] === 216 && header[2] === 255 ? 'image/jpeg'
              : ['GIF87a', 'GIF89a'].includes(header.subarray(0, 6).toString()) ? 'image/gif'
                : header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : '';
        if (!type || type !== file.mimetype || file.size > 5 * 1024 * 1024) throw new Error('CHAT_INVALID_IMAGE');
    }
};

const sendMessage = async (userId, id, content, files = [], clientId, customer = false) => {
    checkMessage(content, files, clientId);
    if (!customer && !mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    let savedRoom, duplicate = false;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            await mongoose.connection.transaction(async (session) => {
                duplicate = false;
                const existing = clientId ? await ChatMessage.findOne({ sender_id: userId, client_id: clientId }).session(session) : null;
                if (existing) {
                    savedRoom = await ChatRoom.findOne({ _id: customer ? existing.room_id : id, ...(customer ? { customer_id: userId } : {}) }).session(session);
                    if (!savedRoom || !savedRoom._id.equals(existing.room_id)) throw new Error('RESOURCE_NOT_FOUND');
                    duplicate = true;
                    return;
                }
                let room;
                if (customer) {
                    room = await customerRoom(userId).session(session);
                    if (!room) room = new ChatRoom({ customer_id: userId, conversation_key: 'customer:' + userId });
                    room.conversation_key = 'customer:' + userId;
                    if (room.status === 'CLOSED') { room.status = 'AI_ACTIVE'; room.assigned_staff_id = null; room.waiting_for_staff = false; }
                    if (room.status === 'AI_ACTIVE' && !room.waiting_for_staff && gemini.isEnabled()) room.ai_pending = true;
                } else {
                    room = await ChatRoom.findOne({ _id: id, status: 'STAFF_ACTIVE', assigned_staff_id: userId }).session(session);
                    if (!room) throw new Error('ROOM_TAKEN');
                }
                await ChatMessage.create([{
                    room_id: room._id, sender_type: customer ? 'CUSTOMER' : 'STAFF', sender_id: userId,
                    content: content.trim(), attachments: files.map((file) => file.path.replace(/\\/g, '/')),
                    ...(clientId ? { client_id: clientId } : {}), read_by: [userId]
                }], { session });
                room.updated_at = new Date();
                await room.save({ session });
                savedRoom = room;
            });
            break;
        } catch (error) {
            if (error.code !== 11000 || attempt === 1) throw error;
        }
    }
    if (duplicate) deleteUploadedFiles(files);
    else {
        notifyChatChanged(savedRoom);
        if (customer && savedRoom.ai_pending) chatAi.queueReply(savedRoom.id);
    }
    try { return await getRoom(savedRoom.id, userId, customer); }
    catch (error) { error.keepUploads = true; throw error; }
};

const markRead = async (userId, id, throughId, customer = false) => {
    if (!mongoose.isObjectIdOrHexString(id) || !mongoose.isObjectIdOrHexString(throughId)) throw new Error('INVALID_DATA');
    const room = await ChatRoom.findOne({ _id: id, ...(customer ? { customer_id: userId } : {}) }).lean();
    if (!room) throw new Error('RESOURCE_NOT_FOUND');
    if (!(await ChatMessage.exists({ _id: throughId, room_id: id }))) throw new Error('RESOURCE_NOT_FOUND');
    const result = await ChatMessage.updateMany({ room_id: id, _id: { $lte: throughId }, ...unreadQuery(userId, customer) }, { $addToSet: { read_by: userId } });
    if (result.modifiedCount) notifyChatChanged(room, userId);
    return getSummary(userId, customer);
};

const closeRoom = async (userId, id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const room = await ChatRoom.findOneAndUpdate({ _id: id, status: 'STAFF_ACTIVE', assigned_staff_id: userId }, { $set: { status: 'CLOSED' } }, { new: true });
    if (!room) throw new Error('ROOM_TAKEN');
    notifyChatChanged(room);
};

const reply = (userId, id, content, files, clientId) => sendMessage(userId, id, content, files, clientId);
const customerReply = (userId, content, files, clientId) => sendMessage(userId, null, content, files, clientId, true);
module.exports = { getRooms, getRoom, getCustomerRoom, getSummary, claimRoom, reply, customerReply, markRead, closeRoom };
