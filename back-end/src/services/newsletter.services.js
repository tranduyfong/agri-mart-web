const mongoose = require('mongoose');
const crypto = require('crypto');
const MarkdownIt = require('markdown-it');
const Newsletter = require('../models/newsletter');
const Subscriber = require('../models/subscriber');
const transporter = require('../configs/mailer.config');
const markdown = new MarkdownIt({ html: false, breaks: true });

const subscribe = async (email) => {
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw new Error('INVALID_DATA');
    await Subscriber.findOneAndUpdate(
        { email: email.trim().toLowerCase() },
        {
            $set: { is_active: true },
            $setOnInsert: { unsubscribe_token: crypto.randomBytes(32).toString('hex') }
        },
        { upsert: true, runValidators: true }
    );
};

const unsubscribe = async (token) => {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('RESOURCE_NOT_FOUND');
    const result = await Subscriber.findOneAndUpdate({ unsubscribe_token: token }, { $set: { is_active: false } });
    if (!result) throw new Error('RESOURCE_NOT_FOUND');
};

const getNewsletters = async (pagination) => {
    const [items, totalElements, active, inactive] = await Promise.all([
        Newsletter.find({}).sort({ created_at: -1 }).skip(pagination.offset).limit(pagination.pageSize).lean(),
        Newsletter.countDocuments({}),
        Subscriber.countDocuments({ is_active: true }),
        Subscriber.countDocuments({ is_active: false })
    ]);
    return {
        items: items.map((item) => ({
            id: item._id.toString(),
            subject: item.subject,
            status: item.status,
            sent_at: item.sent_at,
            created_at: item.created_at,
            recipient_count: item.recipients.length,
            sent_count: item.recipients.filter((entry) => entry.status === 'SENT').length,
            failed_count: item.recipients.filter((entry) => entry.status === 'FAILED').length
        })),
        totalElements,
        subscribers: { active, inactive }
    };
};

const getNewsletter = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const item = await Newsletter.findOne({ _id: id }).lean();
    if (!item) throw new Error('RESOURCE_NOT_FOUND');
    return { ...item, id: item._id.toString(), subscriber_count: await Subscriber.countDocuments({ is_active: true }) };
};

const saveNewsletter = async (userId, id, data) => {
    if (
        typeof data.subject !== 'string' ||
        !data.subject.trim() ||
        data.subject.length > 200 ||
        typeof data.content !== 'string' ||
        !data.content.trim() ||
        data.content.length > 30000
    )
        throw new Error('INVALID_DATA');
    const values = { subject: data.subject.trim(), content: data.content };
    if (id) {
        const old = await getNewsletter(id);
        if (old.status !== 'DRAFT') throw new Error('DRAFT_ONLY');
        const updated = await Newsletter.findOneAndUpdate({ _id: id, status: 'DRAFT' }, { $set: values }, { new: true });
        if (!updated) throw new Error('DRAFT_ONLY');
        return { id };
    }
    return { id: (await Newsletter.create({ ...values, created_by: userId }))._id.toString() };
};

const deliverNewsletter = async (id) => {
    const item = await Newsletter.findById(id);
    try {
        for (const recipient of item.recipients) {
            if (recipient.status !== 'PENDING') continue;
            const subscriber = await Subscriber.findOne({ email: recipient.email, is_active: true }).select('+unsubscribe_token');
            if (!subscriber) recipient.status = 'SKIPPED';
            else {
                try {
                    const baseUrl = (process.env.PUBLIC_API_URL || 'http://localhost:' + (process.env.PORT || 8000) + '/api').replace(
                        /\/$/,
                        ''
                    );
                    const unsubscribeUrl = baseUrl + '/newsletter/unsubscribe/' + subscriber.unsubscribe_token;
                    const result = await transporter.sendMail({
                        from: '"Agri-Mart" <' + process.env.EMAIL_USER + '>',
                        to: recipient.email,
                        subject: item.subject,
                        text: item.content + '\n\nHủy đăng ký: ' + unsubscribeUrl,
                        html:
                            '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;line-height:1.7">' +
                            markdown.render(item.content) +
                            '<hr><a href="' +
                            unsubscribeUrl +
                            '">Hủy đăng ký nhận bản tin</a></div>'
                    });
                    if (result.rejected?.length) throw new Error('Máy chủ email từ chối người nhận');
                    recipient.status = 'SENT';
                } catch (error) {
                    recipient.status = 'FAILED';
                    recipient.error = String(error.message).slice(0, 300);
                }
            }
            await item.save();
        }
        item.status = item.recipients.some((entry) => entry.status === 'FAILED') ? 'PARTIAL' : 'SENT';
        item.sent_at = new Date();
        await item.save();
    } catch {
        await Newsletter.updateOne({ _id: id, status: 'SENDING' }, { $set: { status: 'PARTIAL', sent_at: new Date() } });
    }
};

const sendNewsletter = async (id) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error('MAIL_NOT_CONFIGURED');
    const subscribers = await Subscriber.find({ is_active: true }).select('email');
    if (!subscribers.length) throw new Error('NO_SUBSCRIBERS');
    await getNewsletter(id);
    const item = await Newsletter.findOneAndUpdate(
        { _id: id, status: 'DRAFT' },
        {
            $set: { status: 'SENDING', recipients: subscribers.map((entry) => ({ email: entry.email, status: 'PENDING' })) }
        },
        { new: true }
    );
    if (!item) throw new Error('DRAFT_ONLY');
    setImmediate(() => {
        deliverNewsletter(id).catch(() => undefined);
    });
    return { id, status: 'SENDING', recipient_count: subscribers.length };
};

const recoverSending = async () => {
    await Newsletter.updateMany({ status: 'SENDING' }, { $set: { status: 'PARTIAL', sent_at: new Date() } });
};

module.exports = { subscribe, unsubscribe, getNewsletters, getNewsletter, saveNewsletter, sendNewsletter, recoverSending };
