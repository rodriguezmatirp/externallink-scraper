const mongoose = require('mongoose')
const externalLinkSchema = require('../model/externalLink')
const path = require('path')
const ObjectsToCsv = require('objects-to-csv')

const queryArgsParser = function(start, end, skip, limit, sort, type, showOnly) {
    // Input Sanitization
    sort = Number(sort) ? Number(sort) : -1
    skip = Number(skip) ? Number(skip) : 0
    limit = Number(limit) ? Number(limit) : 20

    var findCondition = {}
    var sortCondition = {}

    start = new Date(start)
    end = new Date(end)
    end = incrementDate(end, 1)

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
            sortCondition['externalLinkCount'] = sort
        else if (type == 'dateWise')
            sortCondition['createdAt'] = sort
    }

    if (showOnly) {
        if (showOnly == 'notVerified')
            findCondition['status'] = false
        else if (showOnly == 'verified')
            findCondition['status'] = true
    }

    return [findCondition, sortCondition, skip, limit]
}


module.exports.getWithLimit = async(start, end, skip, limit, sort, type, showOnly) => {

    try {
        var [findCondition, sortCondition, skip, limit] = queryArgsParser(start, end, skip, limit, sort, type, showOnly)

        // Count used for Pagination in Frontend
        var entriesCount = await externalLinkSchema
            .count(findCondition)

        var doc = await externalLinkSchema
            .find(findCondition)
            .sort(sortCondition)
            .skip(skip)
            .limit(limit < 1001 ? limit : 1000)

        return { result: doc, meta: entriesCount }


    } catch (e) {
        console.error(e)
        return { err: e, status: false }
    }
}


module.exports.getAsFile = async(start, end, skip, limit, sort, type, showOnly) => {
    try {
        var [findCondition, sortCondition, skip, limit] = queryArgsParser(start, end, skip, limit, sort, type, showOnly)

        // Count used for Pagination in Frontend
        var entriesCount = await externalLinkSchema
            .count(findCondition)

        var extLinks = await externalLinkSchema
            .find(findCondition)
            .sort(sortCondition)

        var tempFilename = "Links-Export"

        if (start && start !== "") {
            tempFilename += "-start_" + start
        }
        if (end && end !== "") {
            tempFilename += "-end_" + end
        }

        dirPath = __dirname.replace("controller", 'uploads')
        tempFilename += "-sort_" + sort + "-type_" + type + "-status_" + showOnly
        tempFilename = dirPath + '\\tmp\\' + tempFilename + '.csv'

        // generate file
        const csvHeader = ["Article-Link", "External-Link", "Rel", "Anchor Text", "Date of Post", "Last Modified", "Count", "Status"];
        let result = []
        result.push(csvHeader)
        for (let extLink of extLinks) {
            var temp = []
            temp.push(extLink.articleLink)
            temp.push(extLink.externalLink)
            temp.push(extLink.rel)
            temp.push(extLink.anchorText)
            temp.push(getFormattedDate(extLink.createdAt))
            temp.push(getFormattedDate(extLink.lastModified))
            temp.push(extLink.externalLinkCount)
            temp.push(extLink.showOnly ? "Verified" : "Not yet verified")
            result.push(temp)
        }
        let csv = new ObjectsToCsv(result)
        await csv.toDisk(tempFilename)

        return { fileName: tempFilename }
    } catch (e) {
        console.error(`Error while saving export file - ${tempFilename} : `, e)
        return { error: e }
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

const incrementDate = function(dateInput, increment) {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(
        dateFormatTotime.getTime() + increment * 86400000
    );
    return increasedDate;
};

const getFormattedDate = (date) => {
    var todayTime = new Date(date);
    var day = todayTime.getDate();
    var month = todayTime.getMonth() + 1;
    var year = todayTime.getFullYear();
    return year + "-" + month + "-" + day;
};