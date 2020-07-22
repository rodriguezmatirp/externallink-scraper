const mongoose = require("mongoose");

const MasterSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    link: { type: String, required: true, unique: true },
    algo: { type: String, required: true },
    sitemap_count: { type: Number, default: 0 },
    website_count: { type: Number, default: 0 },
    UpdatedAt: { type: Date, default: Date.now() }
}, {
    timestamps: true
});

module.exports = Masters = mongoose.model("masters", MasterSchema);