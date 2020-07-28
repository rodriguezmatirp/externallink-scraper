const mongoose = require('mongoose')

const externalLinkSchema = new mongoose.Schema({
    externalLink: { type: String, required: true, unique: true },
    article_link: { type: String, required: true },
    sitemap_link: { type: String, required: true },
    rel: { type: String, default: "undefined" },
    externalLink_count: { type: Number, default: 1 },
    status: { type: Boolean, default: false },
    lastmod: { type: Date, required: true }
}, {
    timestamps: true
})

module.exports = externalLink = mongoose.model("externalLink", externalLinkSchema);