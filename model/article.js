const mongoose = require("mongoose");

const ArticleSchema = new mongoose.Schema(
    {
        main_link: { type: String, required: true },
        parent_link: { type: String, required: true },
        articlelink: { type: String, required: true },
        lastmod: { type: Date, required: true },
        page: { type: Number, required: true },
        dofollow:{ type: Array, required: false },
        nofollow:{ type: Array, required: false },
        externalLinks: { type: Array, required: true },
        created_at: { type: Date, required: false, default: Date.now() },
        updated_at: { type: Date, required: false }
    }
);

module.exports = Articles = mongoose.model("articles", ArticleSchema);