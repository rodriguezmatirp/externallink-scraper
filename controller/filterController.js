require('mongoose')
const restrictedSchema = require('../model/restricted')
const axios = require('axios')
const articleSchema = require('../model/article')
const domianSchema = require('../model/domain')
const sitemapSchema = require('../model/sitemap')

// Add a item to the restricted schema
module.exports.add_ = async(url, type) => {
    try {
        const main = await new restrictedSchema({ restricted_link: url, restricted_type: type }).save()

        return { result: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

// Get current items in the restricted schema
module.exports.get = async() => {
    try {
        const main = await restrictedSchema.find({})
        return { doc: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

// Delete a item in the restricted schema
module.exports.deleteRestrict = async(link, type) => {
    try {
        const removed = await restrictedSchema.findOneAndDelete({ restricted_link: link, restricted_type: type })
        return { doc: removed }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}