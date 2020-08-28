require('mongoose')
const externalLinkSchema = require('../model/externalLink')
const ObjectsToCsv = require('objects-to-csv')

const queryArgsParser = function (start, end, sort, type, showOnly) {
    // Input Sanitization
    sort = Number(sort) ? Number(sort) : -1

    const findCondition = {};
    const sortCondition = {};

    start = new Date(start)
    end = new Date(end)
    end = incrementDate(end, 1)

    if (!isNaN(start.getTime()) || !isNaN(end.getTime())) {
        findCondition["lastmod"] = {}
        if (!isNaN(start.getTime()))
            findCondition["lastmod"]["$gte"] = start

        if (!isNaN(end.getTime()))
            findCondition["lastmod"]["$lte"] = end
    }

    if (type) {
        if (type === 'websiteCount')
            sortCondition['externalLinkCount'] = sort
        else if (type === 'dateWise')
            sortCondition['createdAt'] = sort
    }

    if (showOnly) {
        if (showOnly === 'notVerified')
            findCondition['status'] = false
        else if (showOnly === 'verified')
            findCondition['status'] = true
    }

    return [findCondition, sortCondition]
}


module.exports.getWithLimit = async (start, end, skip, limit, sort, type, showOnly) => {
    try {
        skip = Number(skip) ? Number(skip) : 0
        limit = Number(limit) ? Number(limit) : 20
        const [findCondition, sortCondition] = queryArgsParser(start, end, sort, type, showOnly)

        // Count used for Pagination in Frontend
        const entriesCount = await externalLinkSchema
            .count(findCondition);

        const doc = await externalLinkSchema
            .find(findCondition)
            .sort(sortCondition)
            .skip(skip)
            .limit(limit < 1001 ? limit : 1000);

        return {result: doc, meta: entriesCount}


    } catch (e) {
        console.error(e)
        return {err: e, status: false}
    }
}


module.exports.getAsFile = async (start, end, skip, limit, sort, type, showOnly) => {
    let tempFilename = '';
    let dirPath;
    try {
        const [findCondition, sortCondition] = queryArgsParser(start, end, sort, type, showOnly)

        const extLinks = await externalLinkSchema
            .find(findCondition)
            .sort(sortCondition);

        tempFilename = "Links-Export";

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
            const temp = [];
            temp.push(extLink.articleLink)
            temp.push(extLink.externalLink)
            temp.push(extLink.rel)
            temp.push(extLink.anchorText)
            temp.push(getFormattedDate(extLink.createdAt))
            temp.push(getFormattedDate(extLink.lastModified))
            temp.push(extLink.externalLinkCount)
            temp.push(extLink.status ? "Verified" : "Not yet verified")
            result.push(temp)
        }
        let csv = new ObjectsToCsv(result)
        await csv.toDisk(tempFilename)

        return {fileName: tempFilename}
    } catch (e) {
        console.error(`Error while saving export file - ${tempFilename} : `, e)
        return {error: e}
    }
}

module.exports.status = async (link) => {
    try {
        const doc = await externalLinkSchema.findOne({externalLink: link})
        await externalLinkSchema.findOneAndUpdate({externalLink: link}, {status: !doc.status})
        return {result: doc}
    } catch (e) {
        console.log(e)
        return {err: e, status: false}
    }
}

const incrementDate = function (dateInput, increment) {
    const dateFormatToTime = new Date(dateInput);
    return new Date(dateFormatToTime.getTime() + increment * 86400000);
};

const getFormattedDate = (date) => {
    const todayTime = new Date(date);
    const day = todayTime.getDate();
    const month = todayTime.getMonth() + 1;
    const year = todayTime.getFullYear();
    return year + "-" + month + "-" + day;
};