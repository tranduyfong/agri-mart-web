const supportService = require('../services/support.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { deleteUploadedFiles } = require('../utils/file.util');

const getRoom = async (req, res) => {
    try { return successResponse(res, await supportService.getCustomerRoom(req.user.userId, req.query.before)); }
    catch (error) { return staffErrorResponse(res, error); }
};
const getSummary = (customer) => async (req, res) => {
    try { return successResponse(res, await supportService.getSummary(req.user.userId, customer)); }
    catch (error) { return staffErrorResponse(res, error); }
};
const sendMessage = async (req, res) => {
    try {
        return successResponse(res, await supportService.customerReply(req.user.userId, req.body?.content ?? '', req.files, req.body?.client_id));
    } catch (error) {
        if (!error.keepUploads) deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
const markRead = (customer) => async (req, res) => {
    try { return successResponse(res, await supportService.markRead(req.user.userId, req.params.id, req.body?.through_id, customer)); }
    catch (error) { return staffErrorResponse(res, error); }
};
module.exports = { getRoom, getSummary, sendMessage, markRead };
