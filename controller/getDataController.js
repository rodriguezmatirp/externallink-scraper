const mongoose = require("mongoose");
const articleSchema = require("../model/article");
const linksSchema = require('../model/links')
const domainSchema = require('../model/domain')

module.exports.get = async(link, type, start, end, skip, limit) => {
    try {
        const articleCondition = {}
        const linksCondition = { 'articleId': [], isHidden: false }

        skip = Number(skip) ? Number(skip) : 0
        limit = Number(limit) ? Number(limit) : 20
        start = new Date(start)
        end = new Date(end)
        end = await incrementDate(end, 1)

        if (link) {
            const domain = await domainSchema.findOne({ domainSitemap: link })
            articleCondition["domainId"] = domain._id
        }

        if (!isNaN(start.getTime()) || !isNaN(end.getTime())) {
            articleCondition["lastModified"] = {}
            if (!isNaN(start.getTime()))
                articleCondition["lastModified"]["$gte"] = start
            if (!isNaN(end.getTime()))
                articleCondition["lastModified"]["$lte"] = end
        }

        if (type == 'dofollow' || type == 'nofollow')
            linksCondition['rel'] = type

        const articleObjs = {}
        const articles = await articleSchema.find(articleCondition)

        articles.forEach((articleObj) => {
            linksCondition.articleId.push(articleObj._id)
            articleObjs[articleObj._id] = [articleObj.articleLink, articleObj.lastModified]
        })

        const linksCount = await linksSchema.find(linksCondition).count()

        const externalLinks = await linksSchema.find(linksCondition, { isHidden: false })
            .skip(skip)
            .limit(limit)

        var propertyAddedExternalLinks = []

        for (let externalLinkObj of externalLinks) {

            const [articleLink, lastModified] = articleObjs[externalLinkObj['articleId']]

            propertyAddedExternalLinks.push({
                '_id': externalLinkObj['_id'],
                'articleLink': articleLink,
                'lastModified': lastModified,
                'externalLink': externalLinkObj['externalLink'],
                'anchorText': externalLinkObj['anchorText'],
                'status': externalLinkObj['status'],
                'rel': externalLinkObj['rel']
            })
        }

        propertyAddedExternalLinks.sort((objA, objB) => (objA.lastModified < objB.lastModified) ? -1 : 1)

        return { externalLinks: propertyAddedExternalLinks, totalCount: linksCount }

    } catch (error) {
        console.error(error)
    }
}


incrementDate = async(dateInput, increment) => {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(
        dateFormatTotime.getTime() + increment * 86400000
    );
    return increasedDate;
}