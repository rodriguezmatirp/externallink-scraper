const mongoose = require('mongoose')
const externalLinkSchema = require('../model/externalLink')

module.exports.get = async(start, end, skip, limit, sort, type, showOnly) => {
    // Input Sanitization
    sort = Number(sort) ? Number(sort) : -1
    skip = Number(skip) ? Number(skip) : 0
    limit = Number(limit) ? Number(limit) : 0

    var findCondition = {}
    var sortCondition = {}

    try {
        start = new Date(start)
        end = new Date(end)
        end = await incrementDate(end, 1)

        let start_flag = (start.getTime() === start.getTime())
        let end_flag = (end.getTime() === end.getTime())

        if (start_flag || end_flag) {
            findCondition["lastmod"] = {}
            if (start_flag)
                findCondition["lastmod"]["$gte"] = start

            if (end_flag)
                findCondition["lastmod"]["$lte"] = end
        }

        if (type) {
            if (type == 'websiteCount')
                sortCondition['externalLink_count'] = sort
            else if (type == 'dateWise')
                sortCondition['createdAt'] = sort
        }

        if (showOnly) {
            if (showOnly == 'notVerified')
                findCondition['status'] = false
            else if (showOnly == 'verified')
                findCondition['status'] = true
        }

        // Count used for Pagination in Frontend
        var entriesCount = await externalLinkSchema
            .count(findCondition)

        var doc = await externalLinkSchema
            .find(findCondition)
            .sort(sortCondition)
            .skip(skip)
            .limit(limit)

        return { result: doc, meta: entriesCount }

    } catch (e) {
        console.error(e)
        return { err: e, status: false }
    }
}

module.exports.status = async(link, check) => {
    try {
        const doc = await externalLinkSchema.findOne({ externalLink: link })
        await externalLinkSchema.findOneAndUpdate({ externalLink: link }, { status: !doc.status })
        return { result: doc }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

incrementDate = async(dateInput, increment) => {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(
        dateFormatTotime.getTime() + increment * 86400000
    );
    return increasedDate;
};