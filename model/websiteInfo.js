const mongoose = require('mongoose')

const WebsiteInfoSchema = new mongoose.Schema({
    main_link: { type: String, required: true, unique: true },
    sitemap_link: { type: String, required: true },
    sitemap_count: { type: Number, default: 0 },
    website_count: { type: Number, default: 0 },
}, {
    timestamps: true
})

module.exports = WebsiteInfo = mongoose.model("Info_Website", WebsiteInfoSchema)