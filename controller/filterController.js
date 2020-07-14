const mondoose = require('mongoose')
const restrictedSchema = require('../model/restricted')
const axios = require('axios')
const articleSchema = require('../model/article')
const masterSchema = require('../model/master')
const sitemapSchema = require('../model/sitemap')

module.exports.add_ = async(url, type) => {
    try {
        const main = await new restrictedSchema({ restricted_link: url, restricted_type: type }).save()
            // console.log(main)

        return { result: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

module.exports.get = async() => {
    try {
        const main = await restrictedSchema.find({})
        return { doc: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

module.exports.deleteRestrict = async(link, type) => {
    try {
        const removed = await restrictedSchema.findOneAndDelete({ restricted_link: link, restricted_type: type })
        return { doc: removed }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

module.exports.WebsiteInfo = async() => {
    try {
        const base = await masterSchema.find({})
        var result = []
        base.forEach((data) => {
            result.push({ title: data.title, baseSitemap: data.link })
        })
        for (let data of result) {
            var sitemaps = await sitemapSchema.find({ parent_link: data.baseSitemap }).countDocuments()
            data["sitemapCount"] = sitemaps
            var websites = await articleSchema.find({ main_link: data.baseSitemap }).countDocuments()
            data["websiteCount"] = websites
            var lastUpdated = await articleSchema.find({ main_link: data.baseSitemap }).sort({ updated_at: 'desc' }).limit(1)
            if (lastUpdated[0] !== undefined) {
                // console.log(lastUpdated[0])
                data["lastUpdate"] = new Date(lastUpdated[0].updated_at)
            } else {
                data["lastUpdate"] = "Not yet Started"
            }
        }
        return { doc: result }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}