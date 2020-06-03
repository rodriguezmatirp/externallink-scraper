const mongoose = require("mongoose");
const articleSchema = require("../model/article");
const sitemapSchema = require("../model/sitemap");
const historySchema = require("../model/history");

module.exports.get = async (link, skip, limit) => {
    try {
        skip = Number(skip);
        limit = Number(limit);
        const doc = await articleSchema
            .find({ main_link: link })
            .skip(skip)
            .limit(limit);
        let meta_doc=await await articleSchema.find({ main_link: link });
        let meta=meta_doc.length
        let result = [];
        for (let i = 0; i < doc.length; i++) {
            if (doc[i].externalLinks.length == 0) continue;
            else result.push(doc[i]);
        }

        return { result: result, meta: meta };
    } catch (err) {
        console.log(err);
        return { status: false, result: null, err: err };
    }
};
module.exports.getByDate = async (link, start, end, req, res) => {
    try {
        start = new Date(start);
        end = new Date(end);
        end = await incrementDate(end, 1);
        console.log(start);
        console.log(end);
        let doc = "";
        let skip = req.query.skip;
        let limit = req.query.limit;
        let meta_doc = null;
        skip = Number(skip);
        limit = Number(limit);
        let meta = null;
        if (link == "global") {
            console.log("global");

            doc = await articleSchema
                .find({
                    lastmod: {
                        $gt: start,
                        $lt: end,
                    },
                })
                .skip(skip)
                .limit(limit);
            meta_doc = await articleSchema
                .find({
                    lastmod: {
                        $gt: start,
                        $lt: end,
                    },
                });
            meta = meta_doc.length;
        } else {
            console.log("not global");

            doc = await articleSchema
                .find({
                    main_link: link,
                    lastmod: {
                        $gt: start,
                        $lt: end,
                    },
                })
                .skip(skip)
                .limit(limit);

            meta_doc = await articleSchema
                .find({
                    main_link: link,
                    lastmod: {
                        $gt: start,
                        $lt: end,
                    },
                })
            meta = meta_doc.length;
        }

        let result = [];
        for (let i = 0; i < doc.length; i++) {
            if (doc[i].externalLinks.length == 0) continue;
            else result.push(doc[i]);
        }

        return { result: result, meta: meta };
    } catch (err) {
        console.log(err);
        return { status: false, result: null, err: err };
    }
};

module.exports.getdoFollowByDate = async (req, res) => {
    try {
        let skip = req.query.skip;
        let limit = req.query.limit;
        skip = Number(skip);
        limit = Number(limit);
        let doc = "";
        let meta = null;
        let meta_doc = null;
        if (req.query.site == "global") {
            console.log("global");

            doc = await articleSchema.find().skip(skip).limit(limit);
            meta_doc = await articleSchema.find()
            meta = meta_doc.length;

        } else {
            console.log("not global");

            doc = await articleSchema
                .find({ main_link: req.query.site })
                .skip(skip)
                .limit(limit);
            meta_doc = await articleSchema.find({ main_link: req.query.site })
            meta = meta_doc.length;

        }
        let i = 0;
        let globalarrdofollow = [];
        let globalarrnofollow = [];
        for (i = 0; i < doc.length; i++) {
            globalarrdofollow = [];
            globalarrnofollow = [];
            let arr = doc[i].externalLinks;
            for (j = 0; j < arr.length; j++) {
                if (arr[j].rel == "dofollow") {
                    globalarrdofollow.push(arr[j]);
                } else {
                    globalarrnofollow.push(arr[j]);
                }
            }
            console.log("no follow:-" + globalarrnofollow);
            console.log("do follow:-" + globalarrdofollow);
            doc[i].dofollow = globalarrdofollow;
            doc[i].nofollow = globalarrnofollow;
            console.log(doc[i].dofollow);
            console.log(doc[i].nofollow);
        }

        let result = [];
        for (let i = 0; i < doc.length; i++) {
            if (doc[i].externalLinks.length == 0) continue;
            else result.push(doc[i]);
        }

        res.status(200).json({ doc: result, meta: meta });
    } catch (err) {
        console.log(err);

        res.status(400).json({ status: false, result: null, err: err });
    }
};

module.exports.searchByMainLink = async (req, res) => {
    try {
        let query = req.query.query;
        console.log("/^" + query.toLowerCase() + "/");

        const doc = await articleSchema.find({ articlelink: query });

        res.status(200).json({ doc: doc });
    } catch (err) {
        console.log(err);
        return { status: false, result: null, err: err };
    }
};

module.exports.checked = async (req, res) => {
    try {
        let user_id = req.user.id;
        let article_id = req.body.article_id;
        let arr = [];
        let doc = await articleSchema.findOne({ _id: article_id });
        console.log(doc);

        if (doc.checked.length == 0) {
            doc.checked.push(user_id);
            let dochistory = await historySchema.findOne({ user_id: user_id });
            console.log("doc:-" + dochistory);
            if (dochistory == null) {
                console.log("hello");

                let history = new historySchema({
                    user_id: user_id,
                    article: doc,
                });
                dochistory = await history.save();
                console.log(dochistory);
            } else {
                let arr1 = dochistory.article;
                console.log(arr1);

                arr1.push(doc);
                console.log("after push:-" + arr1);

                dochistory = await historySchema.findOneAndUpdate(
                    { user_id: user_id },
                    { article: arr1 }
                );
                console.log(dochistory);
            }
        } else {
            if (doc.checked.includes(user_id)) {
                for (let i = 0; i < doc.checked.length; i++) {
                    if (doc.checked[i] == user_id) {
                        continue;
                    } else {
                        arr.push(doc.checked[i]);
                    }
                }
                doc.checked = arr;
            } else {
                doc.checked.push(user_id);
                let dochistory = await historySchema.findOne({ user_id: user_id });
                console.log(dochistory);
                if (dochistory == null) {
                    console.log("hello");

                    let history = new historySchema({
                        user_id: user_id,
                        article: doc,
                    });
                    dochistory = await history.save();
                    console.log(dochistory);
                } else {
                    arr1 = dochistory.article;
                    console.log("previous:-" + arr1);

                    arr1.push(doc);

                    console.log("array after push:-" + arr1);

                    dochistory = await historySchema.findOneAndUpdate(
                        { user_id: user_id },
                        { article: arr1 }
                    );
                }
            }
        }
        const result = await articleSchema.findOneAndUpdate(
            { _id: article_id },
            { checked: doc.checked }
        );
        res.status(200).json({ doc: result });
    } catch (err) {
        console.log(err);
        return { status: false, result: null, err: err };
    }
};

module.exports.getHistory = async (req, res) => {
    try {
        let user_id = req.query.user_id;

        const doc = await historySchema.find({ user_id: user_id });

        res.status(200).json({ doc: doc });
    } catch (err) {
        console.log(err);
        return { status: false, result: null, err: err };
    }
};
incrementDate = async (dateInput, increment) => {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(
        dateFormatTotime.getTime() + increment * 86400000
    );
    return increasedDate;
};
