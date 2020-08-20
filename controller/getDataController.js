const mongoose = require("mongoose");
const articleSchema = require("../model/article");
const sitemapSchema = require("../model/sitemap");
const linkSchema = require('../model/links')
const domainSchema = require('../model/domain')
const restrictedSchema = require('../model/restricted')

module.exports.get = async(link, type, start, end, skip, limit) => {
    try {
        var condition = {}
        if (link) {
            const domain = await domainSchema.findOne({ domainSitemap: link })
            console.log(domain)
            condition["domainId"] = domain._id
        }

        start = new Date(start)
        end = new Date(end)
        end = await incrementDate(end, 1)

        let start_flag = (start.getTime() === start.getTime())
        let end_flag = (end.getTime() === end.getTime())

        if (start_flag || end_flag) {
            condition["lastModified"] = {}
            if (start_flag) {
                condition["lastModified"]["$gte"] = start
            }
            if (end_flag) {
                condition["lastModified"]["$lte"] = end
            }
        }

        console.log(condition)

        var articles = await articleSchema.aggregate([
            { $match: condition },
            {
                $lookup: {
                    from: "links",
                    let: { "i": "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$articleId", "$$i"] } } },
                        { $project: { "externalLink": 1, "rel": 1, "status": 1, "anchorText": 1, "_id": 1 } }
                    ],
                    as: "externalLinks"
                }
            },
            { $project: { "articleLink": 1, "lastModified": 1, "externalLinks": 1, "_id": 0 } },
            { $sort: { 'lastModified': -1 } },
        ])


        const result = await filterProcess(articles, type)

        return result
    } catch (error) {
        console.error(error)
    }
}


const filterProcess = async(articles, type) => {
    let filtered_all = []
    let filtered_est = []

    var restrict = await restrictedSchema.find()

    restrict.forEach((data) => {
        if (data.restricted_type === "EST") {
            filtered_est.push(data.restricted_link)
        } else {
            filtered_all.push(data.restricted_link)
        }
    })

    console.log('Filtering Process')

    for (let article of articles) {
        for (let externalLink of article.externalLinks) {
            for (let fil of filtered_all) {
                if (externalLink.link.includes(fil)) {
                    delete externalLink.externalLink
                    delete externalLink.rel
                    delete externalLink.status
                    delete externalLink.anchorText
                    break
                } else continue
            }
        }
    }
    for (let article of articles) {
        if (article.articleLink.includes("startuptalky.com/")) continue
        else {
            for (let externalLink of article.externalLinks) {
                for (let fil of filtered_est) {
                    if (externalLink.link) {
                        if (externalLink.link.includes(fil)) {
                            // console.log('Filtering')
                            delete externalLink.externalLink
                            delete externalLink.rel
                            delete externalLink.status
                            delete externalLink.anchorText
                            break
                        } else continue
                    }
                }
            }
        }
    }
    //Filtering ends
    console.log('Filtering Process Done !')

    let unfilteredResult = articles;

    for (let i = 0; i < unfilteredResult.length; i++) {
        var filterExt = []
        for (let data of unfilteredResult[i].externalLinks) {
            if (data.externalLink === undefined) continue
            else {
                if (type === "dofollow") {
                    if (data.rel === undefined || data.rel === "dofollow") {
                        filterExt.push(data)
                    }
                } else if (type === "nofollow") {
                    if (data.rel !== undefined && data.rel !== "dofollow") {
                        filterExt.push(data)
                    }
                } else {
                    filterExt.push(data)
                }
            }
        }
        unfilteredResult[i].externalLinks = filterExt
    }
    let filtered = []

    for (let i = 0; i < unfilteredResult.length; i++) {
        if (unfilteredResult[i].externalLinks.length == 0) continue;
        else filtered.push(unfilteredResult[i]);
    }

    return filtered
}

incrementDate = async(dateInput, increment) => {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(
        dateFormatTotime.getTime() + increment * 86400000
    );
    return increasedDate;
}