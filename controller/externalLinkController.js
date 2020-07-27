const mongoose = require('mongoose')
const externalLinkSchema = require('../model/externalLink')

module.exports.get = async(start, end, skip, limit) => {
    try {
        var condition = {}

        start = new Date(start)
        end = new Date(end)
        end = await incrementDate(end, 1)

        let start_flag = (start.getTime() === start.getTime())
        let end_flag = (end.getTime() === end.getTime())

        if (start_flag || end_flag) {
            condition["lastmod"] = {}
            if (start_flag) {
                condition["lastmod"]["$gte"] = start
            }
            if (end_flag) {
                condition["lastmod"]["$lte"] = end
            }
        }
        var mainMeta = await externalLinkSchema
            .find(condition)
        var doc = await externalLinkSchema
            .find(condition)
            .sort({ lastmod: -1 })
            .skip(Number(skip))
            .limit(Number(limit))

        return { result: doc, meta: mainMeta.length }

    } catch (e) {
        console.log(e)
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