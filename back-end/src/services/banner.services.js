const mongoose = require('mongoose');
const Banner = require('../models/banner');
const { escapeRegex } = require('../utils/string.util');

const bannerStatus = (banner) =>
    !banner.is_active
        ? 'DRAFT'
        : banner.starts_at && banner.starts_at > new Date()
          ? 'UPCOMING'
          : banner.ends_at && banner.ends_at < new Date()
            ? 'ENDED'
            : 'ACTIVE';

const getBanners = async (filters, pagination) => {
    const query = filters.keyword ? { title: { $regex: escapeRegex(filters.keyword), $options: 'i' } } : {};
    const [items, totalElements] = await Promise.all([
        Banner.find(query).sort({ createdAt: -1 }).skip(pagination.offset).limit(pagination.pageSize).lean(),
        Banner.countDocuments(query)
    ]);
    return { items: items.map((item) => ({ ...item, id: item._id.toString(), status: bannerStatus(item) })), totalElements };
};

const getBanner = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const item = await Banner.findById(id).lean();
    if (!item) throw new Error('RESOURCE_NOT_FOUND');
    return { ...item, id: item._id.toString(), status: bannerStatus(item) };
};

const saveBanner = async (id, data, files) => {
    if (files?.length > 1) throw new Error('INVALID_DATA');
    const old = id ? await getBanner(id) : null;
    const image = files?.[0]?.path.replace(/\\/g, '/') || data.image_url || old?.image_url;
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200 || !['POPUP', 'HOME_CAROUSEL'].includes(data.type))
        throw new Error('INVALID_DATA');
    if (typeof image !== 'string' || !/^(https?:\/\/|uploads\/)/.test(image)) throw new Error('INVALID_DATA');
    if (
        data.link_url &&
        (typeof data.link_url !== 'string' || !/^(https?:\/\/|\/(?!\/))/.test(data.link_url) || data.link_url.length > 1000)
    )
        throw new Error('INVALID_DATA');
    const starts = data.starts_at ? new Date(data.starts_at) : null,
        ends = data.ends_at ? new Date(data.ends_at) : null;
    if ((starts && !Number.isFinite(starts.getTime())) || (ends && !Number.isFinite(ends.getTime())) || (starts && ends && starts >= ends))
        throw new Error('INVALID_DATA');
    const values = {
        title: data.title.trim(),
        type: data.type,
        image_url: image,
        link_url: data.link_url || null,
        is_active: data.is_active === true || data.is_active === 'true',
        starts_at: starts,
        ends_at: ends
    };
    const item = old
        ? await Banner.findByIdAndUpdate(id, { $set: values }, { new: true, runValidators: true })
        : await Banner.create(values);
    return { id: item._id.toString() };
};

const getPublicBanners = async () => {
    const now = new Date();
    const items = await Banner.find({
        is_active: true,
        $and: [{ $or: [{ starts_at: null }, { starts_at: { $lte: now } }] }, { $or: [{ ends_at: null }, { ends_at: { $gte: now } }] }]
    })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    return items.map((item) => ({
        id: item._id.toString(),
        title: item.title,
        type: item.type,
        image_url: item.image_url,
        link_url: item.link_url
    }));
};

module.exports = { getBanners, getBanner, saveBanner, getPublicBanners };
