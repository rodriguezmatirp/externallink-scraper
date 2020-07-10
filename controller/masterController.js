const mongoose = require("mongoose");
const masterSchema = require("../model/master");
const articleSchema = require('../model/article')
const sitemapSchema = require('../model/sitemap')

module.exports.insert = async(req) => {
    try {
        const fd = await masterSchema.findOne({ link: req.body.link });
        console.log(fd);

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
        const doc = await masterSchema.find();
        let err = null;
        return { status: true, result: doc, err: err };
    } catch (err) {
        return { status: false, result: null, err: err };
    }
};

module.exports.deleteLink = async(url) => {
    try {
        const master = await masterSchema.findOneAndDelete({ link: url })
        const sitemaps = await sitemapSchema.deleteMany({ parent_link: url })
        const article = await articleSchema.deleteMany({ main_link: url })
        return { status: true }
    } catch (err) {
        return { status: false, err: err }
    }
}