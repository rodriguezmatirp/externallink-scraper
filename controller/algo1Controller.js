const mongoose = require("mongoose");
const masterSchema = require('../model/master')
const articleSchema = require("../model/article");
const sitemapSchema = require("../model/sitemap");
const externalLinkSchema = require('../model/externalLink')
const axios = require("axios");
var xml2js = require("xml2js");
var parser = new xml2js.Parser();
var cheerio = require("cheerio");

module.exports.algo1 = async(req) => {
    const url = req.body.url;
    const html = await fetchPage(url, 6)
    var response = false;
    let flag = false
    let message = "";
    let find = await sitemapSchema.find({ parent_link: url });

    console.log("Sub-sitemaps to scrape : ", find.length)
    if (find.length > 0) {
        var count = find.length;
        console.log("Tables present in database");

        response = await new Promise((resolve, reject) => {
            // console.log(html);

            parser.parseString(html, async function(err, result) {
                console.log("Parsing the page");

                if (result["sitemapindex"]["sitemap"].length > count) {
                    console.log("Site Map Counter Greater than the database count!");
                    const doc = await algo1insertSiteMap(
                        result,
                        url,
                        result["sitemapindex"]["sitemap"].length - count
                    );
                    flag = true
                    if (doc) {
                        message = "New articles updated on sitemap!!";
                        resolve(true);
                    } else {
                        message = "Error in backend Please check 500";
                        resolve(false);
                    }
                } else {
                    console.log("Checking for Updates");

                    const doc = await checkupdates(
                        result,
                        result["sitemapindex"]["sitemap"].length
                    );
                    flag = true
                    console.log("checkupdates log", doc);

                    if (doc) {
                        message = "Sitemap Updated ~!";
                        resolve(true);
                    } else {
                        message = "Error in backend Please check 500";
                        resolve(false);
                    }
                }
            });
        });
        // console.log("response", response);
    } else {
        console.log("here comes 2");
        // for site map insertion//
        response = await new Promise((resolve, reject) => {
            parser.parseString(html, async function(err, result) {
                if (result !== undefined) {
                    var doc = await algo1insertSiteMap(
                        result,
                        url,
                        result["sitemapindex"]["sitemap"].length
                    );
                    flag = true
                }
                if (doc) {
                    message = "First Scrapping data inserted on sitemap!";
                    resolve(true);
                } else {
                    message = "Error in backend Please check 500";
                    resolve(false);
                }
            });
        });
    }

    // end of insertion of site map//

    ////////////////////////////////////////////////////////////////////////////////////////

    find = await sitemapSchema.find({ status: 1, parent_link: req.body.url });
    resp = await new Promise(async(resolve, reject) => {
        var i = 0;
        // console.log(find);

        for (i = 0; i < find.length; i++) {
            const doc = await articleSchema.find({ parent_link: find[i].link });
            if (doc.length == 0) {
                var url = find[i].link;
                // console.log("sitemap getting scratched  :-  " + url);

                const html = await fetchPage(url, 6);

                let response = await new Promise((resolve, reject) => {
                    parser.parseString(html, async function(err, result) {
                        try {
                            var doc = await algo1insertArticle(
                                result,
                                req.body.url,
                                url,
                                result["urlset"]["url"].length,
                                req
                            )
                        } catch (e) {
                            console.log(e)
                        }
                        if (doc) {
                            const update = await sitemapSchema.findOneAndUpdate({ link: url }, { status: 0 });
                            if (update) {
                                console.log("updated " + url + update);

                                message = "First Scrapping data inserted on artile";
                                resolve(true);
                            }
                        } else {
                            message = "Error in backend Please check 500";
                            resolve(false);
                        }
                    });
                });
                if (response == false) {
                    message = "Error in backend Please check 500";
                    resolve(false);
                }
            } else {
                var url = find[i].link;

                // var lastData = await articleSchema.find({ main_link: req.body.url }).sort({ lastmod: 'desc' })

                // console.log(lastData + '--------------------------------------------------')

                var count = doc.length;
                // console.log("parent link scrateched:-" + find[i].link);

                const html = await fetchPage(url, 6);
                let response = await new Promise((resolve, reject) => {
                    parser.parseString(html, async function(err, result) {
                        if (result["urlset"]["url"].length > count) {
                            console.log("Updated Data Found!");

                            const doc = await algo1insertArticle(
                                result,
                                req.body.url,
                                url,
                                result["urlset"]["url"].length - count,
                                req
                                // lastData[0].lastmod
                            );
                            if (doc) {
                                const update = await sitemapSchema.findOneAndUpdate({ link: url }, { status: 0 });
                                if (update) {
                                    // console.log("updated " + url + update);

                                    message = "data Updated artile datasets";
                                    resolve(true);
                                }
                            } else {
                                message = "Error in backend Please check 500";
                                resolve(false);
                            }
                        }
                        console.log("No Updates articles Found!");

                        message = "No updated data Found!";
                        resolve(true);
                    });
                });
                if (response == false) {
                    message = "Error in backend Please check 500";
                    resolve(false);
                }
            }
        }

        resolve(true);
    });

    if (resp === true) {
        return { status: true, message: message, url: url, flag: flag };
    }
    if (resp == false) {
        return { status: true, message: message, url: url, flag: flag };
    }
};

var checkupdates = async(result, length) => {
    try {
        console.log("true");

        var i = 0;
        var counter = 0;
        var arr = [];
        for (i = 0; i < length; i++) {
            var url = result["sitemapindex"]["sitemap"][i].loc[0];
            var lastmod = result["sitemapindex"]["sitemap"][i].lastmod[0];
            // console.log(Date.parse(lastmod));

            let doc = await sitemapSchema.findOne({ link: url });
            // console.log(doc);

            // console.log(Date.parse(doc.lastmod));

            if (Date.parse(doc.lastmod) === Date.parse(lastmod)) {
                console.log("true");
                break;
            } else {
                const res = await sitemapSchema.findOneAndUpdate({ link: url }, { status: 1, lastmod: lastmod });
                // console.log(res);
            }
        }
        return true;
    } catch (err) {
        return false;
        console.log(err);
    }
};

var htmlParser = async(html, filter) => {
    var arr = [];
    var $ = cheerio.load(html);
    $("a").filter(function() {
        var data = $(this);
        let title = data.attr("href");
        rel = data.attr("rel");
        let text = data.text()
        if (/<img.*>/.test(text) === true) {
            // console.log(text)
            var alt = /<img.*?[alt="(.*?)" | alt='(.*?)'].*>/g.exec(text)[1]
                // console.log(alt)
            if (alt !== undefined) {
                text = alt.trim()
            } else {
                text = ""
            }

        }
        if (rel === "dofollow" && !(/^#.*/.test(title)) && title !== '') {
            arr.push({ rel: rel, link: title, text: text });
        } else if (!(/^#.*/.test(title)) && title != '') {
            if (title != undefined) {
                let upper = title.toUpperCase();
                let filterTitle = filter.toUpperCase();
                // console.log("title: -" + title);

                if (
                    title.charAt(0) != "/" &&
                    upper.indexOf(filterTitle) == -1 &&
                    title.indexOf("share.hsforms.com") == -1 &&
                    title.indexOf("javascript:void") == -1
                ) {
                    arr.push({ rel: rel, link: title, text: text });
                    // console.log(title)
                }
            }
        }
    });
    // console.log(arr);

    return arr;
};


const algo1insertArticle = async(result, main_url, url, length, req) => {
    try {
        var links = result["urlset"]["url"];
        console.log("no of articles to be scratched:- " + length);
        // if (!lastDate) {
        //     lastDate = new Date(2010, 00, 00)
        // } else {
        //     lastDate = new Date(lastDate)
        // }
        // console.log(lastDate)
        var i = 0;
        var counter = 0;
        var j = 0;
        var arr = [];
        for (i = 0; i < length; i++) {
            if (result["urlset"]["url"][i].loc[0].includes(".com/tag/") || result["urlset"]["url"][i].loc[0].includes(".com/category")) continue
            else {
                // else if (lastDate <= new Date(result["urlset"]["url"][i].lastmod[0])) {
                console.log(
                    "link getting sctrached:- " + result["urlset"]["url"][i].loc[0]
                );
                arr.push({ link: result["urlset"]["url"][i].loc[0], page: i + 1 });
                const html = await fetchPage(result["urlset"]["url"][i].loc[0], 6);
                var filterTitle = await TitleSplitter(req.body.url);
                const external = await htmlParser(html, filterTitle);
                // console.log(external)
                external.forEach((arr) => {
                    arr.status = false
                })

                const articlemap = new articleSchema({
                    main_link: main_url,
                    parent_link: url,
                    updated_at: Date.now(),
                    externalLinks: external,
                    articlelink: result["urlset"]["url"][i].loc[0],
                    lastmod: result["urlset"]["url"][i].lastmod[0],
                    page: j + 1,
                });

                try {
                    await articlemap.save();
                    await masterSchema.findOneAndUpdate({ link: main_url }, { $inc: { website_count: 1 } })
                    for (let data of external) {
                        saveUniqueExtLink(data.link, data.text, main_url, data.rel, result["urlset"]["url"][i].loc[0], result["urlset"]["url"][i].lastmod[0])
                    }
                    counter += 1;
                } catch (e) {
                    // console.log(e)
                }

                console.log(counter);
                if (counter == length) {
                    return true;
                }
                j++;
            }
        }
    } catch (err) {
        console.log(err);

        return false;
    }
};


const saveUniqueExtLink = async(title, text, sitemap, rel, article_link, lastmod) => {
    if (title !== null) {
        var externalLink_ = title.match(/(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))/)
        if (externalLink_) {
            try {
                if (rel === undefined) {
                    rel = "dofollow"
                } else if (rel.includes("nofollow")) {
                    rel = "nofollow"
                }
                var newLink = new externalLinkSchema({
                    externalLink: externalLink_[0],
                    article_link: article_link,
                    lastmod: lastmod,
                    rel: rel,
                    sitemap_link: sitemap,
                    external_url: title,
                    anchor_text: text
                })
                await newLink.save()
                console.log('Adding external link ' + externalLink_)
            } catch (e) {
                if (e.code === 11000) {
                    await externalLinkSchema.findOneAndUpdate({ externalLink: externalLink_ }, { $inc: { externalLink_count: 1 } })
                    console.log('Incrementing external link ' + externalLink_)
                } else {
                    console.log('Error : website ---' + externalLink_ + e)
                }
                // console.log("Found duplicate External Links -- " + externalLink_)
            }
        }
    }
    // console.log(externalLink[0])
}


const algo1insertSiteMap = async(result, url, length) => {
    try {
        var links = result["sitemapindex"]["sitemap"];
        var i = 0;
        var counter = 0;
        var arr = [];
        for (i = 0; i < length; i++) {
            arr.push({
                link: result["sitemapindex"]["sitemap"][i].loc[0],
                page: i + 1,
            });
            const sitemap = new sitemapSchema({
                parent_link: url,
                updated_at: Date.now(),
                link: result["sitemapindex"]["sitemap"][i].loc[0],
                lastmod: result["sitemapindex"]["sitemap"][i].lastmod[0],
                page: i + 1,
            });

            try {
                await sitemap.save();
                await masterSchema.findOneAndUpdate({ link: url }, { $inc: { sitemap_count: 1 } })
                counter += 1
            } catch (e) {
                console.log(e)
            }
            console.log(counter);
            // console.log(doc);
            if (counter == length) {
                return true;
            }
        }
    } catch (err) {
        return false;
    }
};

const fetchPage = async(url, n) => {
    try {
        const result = await axios.get(url);
        console.log(url)
            //console.log(result.data)
        return result.data;
    } catch (err) {
        if (n === 0) throw err;

        console.log(
            "fetchPage(): Waiting For 3 seconds before retrying the request."
        );
        console.log(`Request Retry Attempt Number: ${7 - n} ====> URL: ${url}`);
        return await fetchPage(url, n - 1);
    }
};

var TitleSplitter = async(url) => {
    var split1 = url.split("//");
    var split2 = split1[1].split(".");
    console.log("title filter:-" + split2[0]);

    return split2[0];
};
``