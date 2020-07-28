const mongoose = require("mongoose");
const masterSchema = require("../model/master");
const articleSchema = require('../model/article')
const sitemapSchema = require('../model/sitemap')
const axios = require('axios')
const Scheduler = require('../scheduler/schedule')
const externalLinkSchema = require('../model/externalLink')


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
        console.log("TaskList before Adding: ", Scheduler.tasksList)
        var temp = await masterSchema.find({})
        temp.forEach((item) => {
            if (!Scheduler.tasksList.includes(item["link"]))
                Scheduler.tasksList.push(item["link"])
        })
        console.log("TaskList after Adding: ", Scheduler.tasksList)
        return { status: true }
    } catch (e) {
        console.log(e)
        return { status: false, err: e }
    }
}

module.exports.WebsiteInfo = async(limit, skip) => {
    try {
        const meta = await masterSchema.find({})
        const info = await masterSchema.find({}).sort({ website_count: 'desc' }).limit(limit).skip(skip)
            // console.log(info)
        return { doc: info, meta: meta.length }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}