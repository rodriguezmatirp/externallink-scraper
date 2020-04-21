const mongoose = require('mongoose');
const articleSchema = require('../model/article');
const sitemapSchema = require('../model/sitemap');

module.exports.get = async (req,skip,limit) => {
    skip=Number(skip);
    limit=Number(limit)
    const doc = articleSchema.find().skip(skip).limit(limit)
    return (doc)
}