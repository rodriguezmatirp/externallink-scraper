const mongoose = require('mongoose');
const articleSchema = require('../model/article');
const sitemapSchema = require('../model/sitemap');

module.exports.get = async (link, skip, limit) => {
    try {
        skip = Number(skip);
        limit = Number(limit);
        const doc = await articleSchema.find({ main_link: link }).skip(skip).limit(limit);
        let result=[]
        for(let i=0;i<doc.length;i++)
        {
            if(doc[i].externalLinks.length==0)
            continue;
            else
            result.push(doc[i]);
        }

        return (result);

    } catch (err) {
        return ({ status: false, result: null, err: err });

    }
}
module.exports.getByDate = async (link, start, end) => {
    try {
        start = new Date(start);
        end = new Date(end)
        end = await incrementDate(end, 1)
        console.log(start);
        console.log(end);
        let doc = "";
        if (link == "global") {
            console.log("global");

            doc = await articleSchema.find({
                lastmod: {
                    $gt: start,
                    $lt: end
                }
            });
        }
        else {
            console.log("not global");

            doc = await articleSchema.find({
                main_link: link,
                lastmod: {
                    $gt: start,
                    $lt: end
                }
            });
        }

        let result=[]
        for(let i=0;i<doc.length;i++)
        {
            if(doc[i].externalLinks.length==0)
            continue;
            else
            result.push(doc[i]);
        }

        return (result);
        return (doc)
    }
    catch (err) {
        return ({ status: false, result: null, err: err });
    }
}

module.exports.getdoFollowByDate = async (req, res) => {
    try {
        start = new Date(req.query.start);
        end = new Date(req.query.end)
        end = await incrementDate(end, 1)
        console.log(start);
        console.log(end);
        let doc = "";
        if (req.query.site == "global") {
            console.log("global");

            doc = await articleSchema.find({
                lastmod: {
                    $gt: start,
                    $lt: end
                }
            });
        }
        else {
            console.log("not global");

            doc = await articleSchema.find({
                main_link: req.query.site,
                lastmod: {
                    $gt: start,
                    $lt: end
                }
            });

        }
        let i = 0;
        let globalarrdofollow = []
        let globalarrnofollow = []
        for (i = 0; i < doc.length; i++) {
            globalarrdofollow = []
            globalarrnofollow = []
            let arr = doc[i].externalLinks;
            for (j = 0; j < arr.length; j++) {
                if (arr[j].rel == "dofollow") {
                    globalarrdofollow.push(arr[j]);
                }
                else {
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

        let result=[]
        for(let i=0;i<doc.length;i++)
        {
            if(doc[i].externalLinks.length==0)
            continue;
            else
            result.push(doc[i]);
        }

       

        res.status(200).json({ doc: result });

    } catch (err) {
        res.status(400).json({ status: false, result: null, err: err });
    }

}

module.exports.searchByMainLink = async (req, res) => {
    try {
        let query = req.query.query
        console.log('/^' + query.toLowerCase() + "/");

        const doc = await articleSchema.find({ articlelink: query });

        res.status(200).json({ doc: doc });

    } catch (err) {
        return ({ status: false, result: null, err: err });

    }
}

module.exports.checked = async (req, res) => {
    try {
        let user_id = req.body.user_id
        let article_id = req.body.article_id;
        let arr = []
        let doc = await articleSchema.findOne({ _id: article_id });
        if (doc.checked.length == 0) {
            doc.checked.push(user_id)
        }
        else {
            if (doc.checked.includes(user_id)) {

                for (let i = 0; i < doc.checked.length; i++) {
                    if (doc.checked[i] == user_id) {
                        continue;
                    }
                    else {
                        arr.push(doc.checked[i]);
                    }
                }
                doc.checked = arr;
            }
            else {
                doc.checked.push(user_id)
            }
        }
        const result = await articleSchema.findOneAndUpdate({ _id: article_id }, { checked: doc.checked });
        res.status(200).json({ doc: result });

    } catch (err) {
        return ({ status: false, result: null, err: err });

    }
}
incrementDate = async (dateInput, increment) => {
    var dateFormatTotime = new Date(dateInput);
    var increasedDate = new Date(dateFormatTotime.getTime() + (increment * 86400000));
    return increasedDate;
}