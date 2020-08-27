/*  
articleSchema:
    Schema that holds the info of an Article which is scraped from sub-sitemaps

Properties : 
    sitemapIDs  - array of ObjectIds of records in sitemapSchema 
                  [Multiple sitemaps can have links to same article]
    disabled -  this is for websites which cannot be crawled or is not a valid website
    articleUrl  - the links present in subsitemaps
    lastChecked - when the page was last checked for new external links
    externalLinks  -  Array of objectIds for records in linksSchema
*/

const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
    domainId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'domains' },
    sitemapId: { type: mongoose.Schema.Types.ObjectId, required: true },
    blocked: { type: Boolean, default: false },
    articleLink: { type: String, required: true, unique: true },
    lastChecked: { type: Date, required: true, default: Date.now() },
    lastModified: { type: Date, required: true }
}, {
    timestamps: true
});

module.exports = articles = mongoose.model("articles", articleSchema);