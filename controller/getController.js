const mongoose = require('mongoose');
const articleSchema = require('../model/article');
const sitemapSchema = require('../model/sitemap');

module.exports.get = async (link, skip, limit) => {
    try {
        skip = Number(skip);
        limit = Number(limit);
        const doc = articleSchema.find({ main_link: link }).skip(skip).limit(limit);

        return (doc);

    } catch (err) {
        return ({ status: false, result: null, err: err });

    }
}
module.exports.getByDate = async (link, start, end) => {
    try {
        start = new Date(start);
        end = new Date(end)
        console.log(start);
        console.log(end);
        let doc = "";
        if (link == "global") {
            console.log("global");

            doc = await articleSchema.find({
                lastmod: {
                    $gt: start,
                    $lt: end
                }
            });
        }
        else {
            console.log("not global");

            doc = await articleSchema.find({
                main_link: link,
                lastmod: {
                    $gt: start,
                    $lt: end
                }
            });
        }
        return (doc)
    }
    catch (err) {
        return ({ status: false, result: null, err: err });
    }
}