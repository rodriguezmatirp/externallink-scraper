/* 

sitemapSchema:
    Schema to hold the sitemap links that are found when scrapping

Properties:

    root        - ObjectIds to parent sitemap where the sitemap was found
                  [Is a empty string for manually added sitemaps]    
    sitemapLink - sitemap URL
    disabled    - to disable a particular sitemap
    contents    - array containing references to articles or other sitemaps

*/

const mongoose = require("mongoose");

const sitemapSchema = new mongoose.Schema({
    domainId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'domains' },
    parentSitemapId: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    sitemapLink: { type: String, required: true, unique: true },
    lastChecked: { type: Date, required: true, default: Date.now() },
    lastModified: { type: Date, required: true }
}, {
    timestamps: true
});

module.exports = sitemap = mongoose.model("sitemaps", sitemapSchema);