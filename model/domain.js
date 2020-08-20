const mongoose = require("mongoose");
const domainSchema = new mongoose.Schema({
    domainSitemap: { type: String, required: true, unique: true },
    subSitemapCount: { type: Number, default: 0 },
    websiteCount: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = domains = mongoose.model("domains", domainSchema);