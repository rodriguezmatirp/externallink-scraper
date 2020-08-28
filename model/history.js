const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema(
    {
        user_id: {type: String, required: false},
        article: {type: Array, required: false}
    }
);

module.exports = Histoey = mongoose.model("history", HistorySchema);