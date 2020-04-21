const mongoose = require('mongoose');
const articleSchema = require('../model/article');
const sitemapSchema = require('../model/sitemap');

module.exports.get = async (link, skip, limit) => {
    skip = Number(skip);
    limit = Number(limit)
    const doc = articleSchema.find({ main_link: link }).skip(skip).limit(limit)
    return (doc)
}