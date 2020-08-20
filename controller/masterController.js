const mongoose = require("mongoose");
const linksSchema = require('../model/links')
const domainSchema = require("../model/domain");
const articleSchema = require('../model/article')
const sitemapSchema = require('../model/sitemap')
const externalLinkSchema = require('../model/externalLink')


module.exports.insert = async(req) => {
    try {
        re = req.body.domainSitemap.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}(\.[a-z]{2,6}|:[0-9]{3,4})\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)sitemap[\._]xml\/{0,1}$/g)
        url = re[0]
        if (!url || url == '')
            throw new Error("Invalid sitemap link. If you think this is wrong, please contact the devs.")

        var domain = new domainSchema({ domainSitemap: url });
        domain = await domain.save();

        return { status: true, result: domain, err: null };
    } catch (err) {
        console.error(`Domain Insertion error for ${req.body.domainSitemap} : \n`, err);
        return { status: false, result: null, err: err };
    }
};

module.exports.getAllDomains = async() => {
    try {
        const domains = await domainSchema.find({});
        return { status: true, result: domains, err: null };
    } catch (err) {
        return { status: false, result: null, err: err };
    }
};


module.exports.deleteLink = async(url) => {
    try {
        var domain = await domainSchema.findOne({ domainSitemap: url })
        await linksSchema.deleteMany({ domainId: domain._id })
        await articleSchema.deleteMany({ domainId: domain._id })
        await sitemapSchema.deleteMany({ domainId: domain._id })
        await domainSchema.deleteOne({ _id: domain._id })
        await externalLinkSchema.deleteMany({ domainId: domain._id })
        return { status: true }
    } catch (err) {
        console.log(err)
        return { status: false, err: err }
    }
}

module.exports.websiteInfo = async(limit, skip, sort, type) => {
    // Input Sanitization
    sort = Number(sort) ? Number(sort) : -1
    skip = Number(skip) ? Number(skip) : 0
    limit = Number(limit) ? Number(limit) : 0

    var sortCondition = {}

    try {
        if (type) {
            if (type == 'websiteCount')
                sortCondition['websiteCount'] = sort
            else if (type == 'dateWise')
                sortCondition['updatedAt'] = sort
        }
        const count = await domainSchema.countDocuments()
        const info = await domainSchema.find()
            .sort(sortCondition)
            .limit(limit)
            .skip(skip)

        return { doc: info, totalCount: count }
    } catch (err) {
        console.error(err)
        return { err: err, status: false }
    }
}