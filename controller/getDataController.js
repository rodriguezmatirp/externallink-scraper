const mongoose = require("mongoose");
const articleSchema = require("../model/article");
const sitemapSchema = require("../model/sitemap");
const linksSchema = require('../model/links')
const domainSchema = require('../model/domain')
const restrictedSchema = require('../model/restricted')

module.exports.get = async(link, type, start, end, skip, limit) => {
    try {
        const articleCondition = {}
        const linksCondition = { 'articleId': [] }

        skip = Number(skip) ? Number(skip) : 0
        limit = Number(limit) ? Number(limit) : 20
        start = new Date(start)
        end = new Date(end)
        end = await incrementDate(end, 1)

        if (link) {
            const domain = await domainSchema.findOne({ domainSitemap: link })
            articleCondition["domainId"] = domain._id
        }

        let start_flag = (start.getTime() === start.getTime())
        let end_flag = (end.getTime() === end.getTime())

        if (start_flag || end_flag) {
            articleCondition["lastModified"] = {}
            if (start_flag) {
                articleCondition["lastModified"]["$gte"] = start
            }
            if (end_flag) {
                articleCondition["lastModified"]["$lte"] = end
            }
        }

        if (type == 'dofollow' || type == 'nofollow')
            linksCondition['rel'] = type

        var articles = await articleSchema.find(articleCondition)

        const articleObjs = {}

        articles.forEach((articleObj) => {
            linksCondition.articleId.push(articleObj._id)
            articleObjs[articleObj._id] = [articleObj.articleLink, articleObj.lastModified]
        })


        const externalLinkObjs = await linksSchema.find(linksCondition)

        var filteredExternalLinks = []

        // Filter process
        const filterForAll = [],
            filterExceptStalky = []

        var restrict = await restrictedSchema.find()

        restrict.forEach((data) => {
            if (data.restricted_type === "EST") {
                filterExceptStalky.push(data.restricted_link)
            } else {
                filterForAll.push(data.restricted_link)
            }
        })

        for (let externalLinkObj of externalLinkObjs) {

            const [articleLink, lastModified] = articleObjs[externalLinkObj['articleId']]

            var shouldInclude = !filterForAll.some(restricted => externalLinkObj['externalLink'].includes(restricted))

            if (shouldInclude && !articleLink.includes("startuptalky.com/"))
                shouldInclude = !filterExceptStalky.some(restricted => externalLinkObj['externalLink'].includes(restricted))

            if (shouldInclude)
                filteredExternalLinks.push({
                    '_id': externalLinkObj['_id'],
                    'articleLink': articleLink,
                    'lastModified': lastModified,
                    'externalLink': externalLinkObj['externalLink'],
                    'anchorText': externalLinkObj['anchorText'],
                    'status': externalLinkObj['status'],
                    'rel': externalLinkObj['rel']
                })
        }

        const totalArticleLength = filteredExternalLinks.length

        filteredExternalLinks.sort((objA, objB) => (objA.lastModified < objB.lastModified) ? 1 : -1)

        // 
        // filteredExternalLinks = filteredExternalLinks.slice(skip)
        // filteredExternalLinks = filteredExternalLinks.slice(0, limit)

        return { externalLinks: filteredExternalLinks, totalCount: totalArticleLength }
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