const mongoose = require('mongoose')

const restrictedSchema = new mongoose.Schema({
    restricted_link: { type: String, required: true, trim: true },
    restricted_type: { type: String, required: true, default: "ALL" },
    created_at: { type: Date, required: true, default: Date.now() },
    count: { type: Number }
})

module.exports = restrictedLinks = mongoose.model("restrictedLinks", restrictedSchema)