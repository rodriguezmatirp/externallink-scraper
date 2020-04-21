const mongoose = require("mongoose");

const SiteMapSchema = new mongoose.Schema(
    {
        parent_link: { type: String, required: true },
        page: { type: Number, required: true },
        link: { type: String, required: true },
        status:{type:Number,required:false,default:1},
        lastmod:{type:Date,required:true},
        created_at: { type: Date, required: false, default: Date.now() },
        updated_at: { type: Date, required: false }
    },
    { timestamps: true }
);

module.exports = SiteMap = mongoose.model("SiteMap", SiteMapSchema);