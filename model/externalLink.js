const mongoose = require('mongoose')

const externalLinkSchema = new mongoose.Schema({
    externalLink: { type: String, required: true, unique: true },
    article_link: { type: String, required: true },
    sitemap_link: { type: String, required: true },
    rel: { type: String, default: "dofollow" },
    externalLink_count: { type: Number, default: 1 },
    status: { type: Boolean, default: false },
    anchor_text: { type: String },
    lastmod: { type: Date, required: true },
    external_url: { type: String, required: true, unique: true }
}, {
    timestamps: true
})

module.exports = externalLink = mongoose.model("externalLink", externalLinkSchema);