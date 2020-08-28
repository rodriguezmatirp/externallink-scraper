const mongoose = require("mongoose");
/*
LinksSchema:
        Schema which holds the data of externalLinks that is scraped from 
    Article Links in sitemaps 
    
    Properties : 
        articleId  - ObjectId of article from which external links was found
        externalLink - the external link
        rel - property of anchor tag, default - dofollow        
        status - whether the link is checked manually by the admin
        anchorText - text present in anchor tag for the particular link

*/

const linksSchema = new mongoose.Schema({
    domainId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'domains'},
    articleId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'articles'},
    externalLink: {type: String, required: true, minlength: 4},
    rel: {type: String, required: true, default: "dofollow"},
    anchorText: {type: String, trim: true, default: ""},
    isHidden: {type: Boolean, default: false},
    status: {type: Boolean, default: false}
}, {
    timestamps: true
});

module.exports = articles = mongoose.model("links", linksSchema);