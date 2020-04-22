const mongoose = require("mongoose");
const articleSchema = require("../model/article");
const sitemapSchema = require("../model/sitemap");
const axios = require("axios");
var fs = require("fs");
var xml2js = require("xml2js");
var parser = new xml2js.Parser();
var cheerio = require("cheerio");

module.exports.algo1 = async (req) => {
  const url = req.body.url;
  const html = await fetchPage(url, 6);
  let response = false;
  let message = "";
  let find = await sitemapSchema.find({ parent_link: url });

  if (find.length > 0) {
    var count = find.length;
    console.log("here comnes");

    response = await new Promise((resolve, reject) => {
      console.log("here comnes12");
      console.log(html);

      parser.parseString(html, async function (err, result) {
        console.log("here comnes12");

        if (result["sitemapindex"]["sitemap"].length > count) {
          console.log("here comnes12");
          const doc = await algo1insertSiteMap(
            result,
            url,
            result["sitemapindex"]["sitemap"].length - count
          );
          if (doc) {
            message = "New articles updated on sitemap!!";
            resolve(true);
          } else {
            message = "Error in backend Please check 500";
            resolve(false);
          }
        } else {
          console.log("here comnes123");

          const doc = await checkupdates(
            result,
            result["sitemapindex"]["sitemap"].length
          );
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
    console.log("response", response);
  } else {
    console.log("here cpmes 2");

    // for site map insertion//
    response = await new Promise((resolve, reject) => {
      parser.parseString(html, async function (err, result) {
        const doc = await algo1insertSiteMap(
          result,
          url,
          result["sitemapindex"]["sitemap"].length
        );
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

  find = await sitemapSchema.find({ status: 1 });
  resp = await new Promise(async (resolve, reject) => {
    var i = 0;
    console.log(find);

    for (i = 0; i < find.length; i++) {
      const doc = await articleSchema.find({ parent_link: find[i].link });
      if (doc.length == 0) {
        var url = find[i].link;
        console.log(url);

        const html = await fetchPage(url, 6);

        let response = await new Promise((resolve, reject) => {
          parser.parseString(html, async function (err, result) {
            const doc = await algo1insertArticle(
              result,
              req.body.url,
              url,
              result["urlset"]["url"].length
            );
            if (doc) {
              const update = await sitemapSchema.findOneAndUpdate(
                { link: url },
                { status: 0 }
              );
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
        console.log("nothing");
      }
    }

    resolve(true);
  });

  if (resp === true) {
    return { status: true, message: message, url: url };
  }
  if (resp == false) {
    return { status: true, message: message, url: url };
  }
};

// global.sitemap
// findsitemap = async (url) => {
//     const html = await fetchPage(url, 6);
//     let response = await new Promise((resolve, reject) => {
//         parser.parseString(html, async function (err, result) {
//             if (result['sitemapindex'] == undefined) {

//             }
//             else {

//             }
//         })
//     })

// }

var checkupdates = async (result, length) => {
  try {
    console.log("true");

    var i = 0;
    var counter = 0;
    var arr = [];
    for (i = 0; i < length; i++) {
      var url = result["sitemapindex"]["sitemap"][i].loc[0];
      var lastmod = result["sitemapindex"]["sitemap"][i].lastmod[0];
      console.log(Date.parse(lastmod));

      let doc = await sitemapSchema.findOne({ link: url });
      console.log(doc);

      console.log(Date.parse(doc.lastmod));

      if (Date.parse(doc.lastmod) === Date.parse(lastmod)) {
        console.log("true");
        break;
      } else {
        sitemapSchema.findOneAndUpdate({ link: url }, { status: 1 });
      }
    }
    return true;
  } catch (err) {
    return false;
    console.log(err);
  }
};

var htmlParser = async (html) => {
  var arr = [];
  var $ = cheerio.load(html);
  $("a").filter(function () {
    var data = $(this);
    let title = data.attr("href");
    rel = data.attr("rel");
    if (
      title.charAt(0) != "/" &&
      title.indexOf("yourstory") == -1 &&
      title.indexOf("YourStory") == -1 &&
      title.indexOf("share.hsforms.com") == -1
    ) {
      if (rel == "dofollow") arr.push({ rel: rel, link: title });
      else arr.push({ rel: "nofollow", link: title });
    }
  });
  console.log(arr);
  return arr;
};

const algo1insertArticle = async (result, main_url, url, length) => {
  try {
    var links = result["urlset"]["url"];
    var i = 0;
    var counter = 0;
    var arr = [];
    for (i = 0; i < length; i++) {
      arr.push({ link: result["urlset"]["url"][i].loc[0], page: i + 1 });
      const html = await fetchPage(result["urlset"]["url"][i].loc[0], 6);
      4;
      const external = await htmlParser(html);
      const articlemap = new articleSchema({
        main_link: main_url,
        parent_link: url,
        updated_at: Date.now(),
        externalLinks: external,
        articlelink: result["urlset"]["url"][i].loc[0],
        lastmod: result["urlset"]["url"][i].lastmod[0],
        page: i + 1,
      });
      const doc = await articlemap.save();
      console.log(counter);
      // console.log(doc);

      if (doc) {
        counter = counter + 1;
      }
      if (counter == length) {
        return true;
      }
    }
  } catch (err) {
    return false;
  }
};

const algo1insertSiteMap = async (result, url, length) => {
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
      const doc = await sitemap.save();
      console.log(counter);
      // console.log(doc);

      if (doc) {
        counter = counter + 1;
      }
      if (counter == length) {
        return true;
      }
    }
  } catch (err) {
    return false;
  }
};

const fetchPage = async (url, n) => {
  try {
    const result = await axios.get(url);
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
