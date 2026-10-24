const mongoose = require('mongoose');
const ChatRoom = require('../models/chatRoom');
const ChatMessage = require('../models/chatMessage');

const getRooms = async (status) => {
    const query = {};
    if (status && ['AI_ACTIVE', 'STAFF_ACTIVE', 'CLOSED'].includes(status)) query.status = status;
    const rooms = await ChatRoom.find(query)
        .populate('customer_id', 'full_name')
        .populate('assigned_staff_id', 'full_name')
        .sort({ updated_at: -1 })
        .limit(100)
        .lean();
    return rooms.map((room) => ({
        id: room._id.toString(),
        customer_name: room.customer_id?.full_name || 'Khách hàng',
        status: room.status,
        assigned_staff_id: room.assigned_staff_id?._id.toString() || null,
        staff_name: room.assigned_staff_id?.full_name || null,
        updated_at: room.updated_at
    }));
};

const getRoom = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const room = await ChatRoom.findOne({ _id: id }).populate('customer_id', 'full_name').lean();
    if (!room) throw new Error('RESOURCE_NOT_FOUND');
    const messages = await ChatMessage.find({ room_id: id }).sort({ created_at: -1, _id: -1 }).limit(200).lean();
    return {
        id: room._id.toString(),
        customer_name: room.customer_id?.full_name || 'Khách hàng',
        status: room.status,
        assigned_staff_id: room.assigned_staff_id?.toString() || null,
        messages: messages.reverse().map((message) => ({
            id: message._id.toString(),
            sender_type: message.sender_type,
            content: message.content,
            attachments: message.attachments,
            created_at: message.created_at
        }))
    };
};

const claimRoom = async (userId, id) => {
    await getRoom(id);
    const room = await ChatRoom.findOneAndUpdate(
        { _id: id, $or: [{ status: 'AI_ACTIVE' }, { status: 'STAFF_ACTIVE', assigned_staff_id: userId }] },
        { $set: { status: 'STAFF_ACTIVE', assigned_staff_id: userId } },
        { new: true }
    );
    if (!room) throw new Error('ROOM_TAKEN');
    return getRoom(id);
};

const reply = async (userId, id, content, files) => {
    if (typeof content !== 'string' || content.length > 5000 || files?.length > 3 || (!content.trim() && !files?.length))
        throw new Error('INVALID_DATA');
    await mongoose.connection.transaction(async (session) => {
        if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
        const room = await ChatRoom.findOne({ _id: id, status: 'STAFF_ACTIVE', assigned_staff_id: userId }).session(session);
        if (!room) throw new Error('ROOM_TAKEN');
        await ChatMessage.create(
            [
                {
                    room_id: id,
                    sender_type: 'STAFF',
                    sender_id: userId,
                    content: content.trim(),
                    attachments: (files || []).map((file) => file.path.replace(/\\/g, '/'))
                }
            ],
            { session }
        );
        room.updated_at = new Date();
        await room.save({ session });
    });
    return getRoom(id);
};

const closeRoom = async (userId, id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const room = await ChatRoom.findOneAndUpdate(
        { _id: id, status: 'STAFF_ACTIVE', assigned_staff_id: userId },
        { $set: { status: 'CLOSED' } }
    );
    if (!room) throw new Error('ROOM_TAKEN');
};

module.exports = { getRooms, getRoom, claimRoom, reply, closeRoom };
