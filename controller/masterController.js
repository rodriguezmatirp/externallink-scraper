const mongoose = require("mongoose");
const masterSchema = require("../model/master");
const articleSchema = require('../model/article')
const sitemapSchema = require('../model/sitemap')
const axios = require('axios')
const Scheduler = require('../scheduler/schedule')
const externalLinkSchema = require('../model/externalLink')
const algo1 = require('../controller/algo1Controller')
const fs = require('fs')


module.exports.insert = async(req) => {
    try {
        const fd = await masterSchema.findOne({ link: req.body.link });
        console.log("---Success adding " + req.body.link + " filter in database-----");

        if (fd == null) {
            const master = new masterSchema(req.body);
            const doc = await master.save();
            let err = null;
            return { status: true, result: doc, err: err };
        }
        return { status: false, result: null, err: "Cannot have multiple links" };
    } catch (err) {
        console.log(err);

        return { status: false, result: null, err: err };
    }
};
module.exports.getAll = async() => {
    try {
        const doc = await masterSchema.find({});
        // console.log(doc)
        let err = null;
        return { status: true, result: doc, err: err };
    } catch (err) {
        return { status: false, result: null, err: err };
    }
};

module.exports.deleteLink = async(url) => {
    try {
        await masterSchema.findOneAndDelete({ link: url })
        await sitemapSchema.deleteMany({ parent_link: url })
        await articleSchema.deleteMany({ main_link: url })
        await externalLinkSchema.deleteMany({ sitemap_link: url })
        return { status: true }
    } catch (err) {
        return { status: false, err: err }
    }
}

module.exports.crawlAll_ = async() => {
    try {
        var temp = await masterSchema.find({ blocked: false })
            // temp.forEach((item) => {
            //     if (!Scheduler.tasksList.includes(item["link"]))
            //         Scheduler.tasksList.push(item["link"])
            // })
            // console.log("TaskList after Adding: ", Scheduler.tasksList)
        for (item of temp) {
            await algo1.algo1({ body: { url: item.link } })
        }
        return { status: true }
    } catch (e) {
        console.error(e)
        return { status: false, err: e }
    }
}

module.exports.WebsiteInfo = async(limit, skip, sort, type) => {
    // Input Sanitization
    sort = Number(sort) ? Number(sort) : -1
    skip = Number(skip) ? Number(skip) : 0
    limit = Number(limit) ? Number(limit) : 0

    var sortCondition = {}

    try {
        if (type) {
            if (type == 'websiteCount')
                sortCondition['website_count'] = sort
            else if (type == 'dateWise')
                sortCondition['updatedAt'] = sort
        }
        const count = await masterSchema.count()
        const info = await masterSchema.find()
            .sort(sortCondition)
            .limit(limit)
            .skip(skip)

        return { doc: info, meta: count }
    } catch (e) {
        console.error(e)
        return { err: e, status: false }
    }
}

//Auto add the sitemap
module.exports.autoAdd = autoAdd = async() => {
    var list = []
    let data = fs.readFileSync('./controller/sitemaps.json', 'utf-8')
    list = JSON.parse(data)
    for (item in list) {
        if (item >= 50) {
            break
        }
        var extracted_title = list[item].match(/:\/\/(.[^/]+)/)[1]
        const newSite = new masterSchema({
            link: list[item],
            title: extracted_title,
            algo: 1
        })
        try {
            await newSite.save()
            await algo1.algo1({ body: list[item] })
            console.log('Saved  : ', item.link)
        } catch (e) {
            console.log('Sitemap already present in database')
        }
    }
}

// autoAdd()