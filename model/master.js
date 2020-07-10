const mongoose = require("mongoose");

const MasterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, required: true, unique: true },
    algo: { type: String, required: true },
    created_at: { type: Date, required: false, default: Date.now() },
    updated_at: { type: Date, required: false }
});

module.exports = Masters = mongoose.model("masters", MasterSchema);