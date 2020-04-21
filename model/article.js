const mongoose = require("mongoose");

const ArticleSchema = new mongoose.Schema(
    {
        main_link:{type:String,required:true},
        parent_link: { type: String, required: true },
        articlelink: { type: String, required: true },
        page: { type: Number, required: true },
        externalLinks:{type:Array,required:true},
        created_at: { type: Date, required: false, default: Date.now() },
        updated_at: { type: Date, required: false }
    },
    { timestamps: true }
);

module.exports = Articles = mongoose.model("articles", ArticleSchema);