const mongoose = require("mongoose");

const externalLinkSchema = new mongoose.Schema({
    domainId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'domains' },
    externalLink: { type: String, required: true, unique: true },
    externalLinkCount: { type: Number, default: 1 },
    articleLink: { type: String, required: true },
    rel: { type: String, default: "dofollow" },
    anchorText: { type: String },
    lastModified: { type: Date, required: true },
    status: { type: Boolean, default: false },
    externalUrl: { type: String, required: true, unique: true }
}, {
    timestamps: true
})

module.exports = externalLinks = mongoose.model("externalLinks", externalLinkSchema);