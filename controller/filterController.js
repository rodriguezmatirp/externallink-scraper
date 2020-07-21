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