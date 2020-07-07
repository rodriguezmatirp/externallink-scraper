const mongoose = require('mongoose')

const RestrictedSchema = new mongoose.Schema({
    restricted_link: { type: String, required: true, trim: true },
    created_at: { type: Date, required: true, default: Date.now() },
    count: { type: Number }
})

module.exports = Restricted = mongoose.model("restricted", RestrictedSchema)