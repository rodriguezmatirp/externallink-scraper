const masterSchema = require('../model/master')
const articleSchema = require('../model/article')
const sitemapSchema = require('../model/sitemap')
const mongoose = require('mongoose')

module.exports.updateDatabase = async() => {
    try {
        var masterBase = await masterSchema.find({})
        for (let data of masterBase) {
            var sitemap = await sitemapSchema.find({ parent_link: data.link })
            var website = await articleSchema.find({ main_link: data.link })
            var update = await masterSchema.findOneAndUpdate({ link: data.link }, {
                sitemap_count: sitemap.length,
                website_count: website.length
            })
        }
        console.log('Done')
        return { updated: masterBase }
    } catch (e) {
        console.log(e)
        return { status: false }
    }
}