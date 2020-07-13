var express = require("express");
var router = express.Router();
var algo1Controller = require("../controller/algo1Controller");
var getController = require("../controller/getController");
var masterController = require("../controller/masterController");
var statusController = require("../controller/statusController")
var filterController = require('../controller/filterController')
var userController = require('../controller/userController')
const { allAuth } = require("../middlewares/auth");

/* GET home page. */
router.post("/algo1", async(req, res, next) => {
    const response = await algo1Controller.algo1(req);
    res.status(200).json({ doc: response });
});

router.get("/crawlAll", async(req, res, next) => {
    const response = await masterController.crawlAll()
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

router.post('/restrict', async(req, res, next) => {
    var url = req.query.link
    const response = await filterController.add_(url)
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

router.get('/deleteWebsite', async(req, res, next) => {
    const link = req.query.link
    const response = await masterController.deleteLink(link)
    if (response.err) {
        res.status(400).json({ err: 'Unable to delete' })
    } else {
        res.status(200).json({ status: 'Deleted Successfully!' })
    }
})

router.get('/deleteRestricted', async(req, res, next) => {
    const link = req.query.link
    const response = await filterController.deleteRestrict(link)
    if (response.err) {
        res.status(400).json({ err: response.err })
    } else {
        res.status(200).json({ status: 'Deleted Successfully!' })
    }
})

router.get('/restrict', async(req, res, next) => {
    const response = await filterController.get()
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

router.get('/info', async(req, res, next) => {
    const response = await filterController.WebsiteInfo()
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

router.get("/deleteProfile", async(req, res, next) => {
    var username = req.query.username
    const response = await userController.deleteProfile(username)
    if (response.err) {
        res.status(400).json({ result: response })
    } else {
        res.status(200).json(response)
    }
})
router.get("/getUsers", async(req, res, next) => {
    const response = await userController.getUsers()
    if (response.err == null) {
        res.status(200).json({ result: response })
    } else {
        res.status(400).json(response)
    }
})

router.get("/status", async(req, res, next) => {
    var link = req.query.link
    var parent_link = req.query.parent
    const response = await statusController.postStatus(link, parent_link)
    if (response.err == null) {
        res.status(200).json({ doc: response })
    } else {
        res.status(400).json(response)
    }
})

router.post("/master", async(req, res, next) => {
    const response = await masterController.insert(req);
    if (response.err == null) res.status(200).json(response);
    else {
        res.status(400).json(response);
    }
});

router.get("/master", async(req, res, next) => {
    const response = await masterController.getAll();
    res.status(200).json(response);
});

router.get("/get/algo1", async(req, res, next) => {
    console.log(req.query.site);
    var link = req.query.site;
    var skip = req.query.skip;
    var limit = req.query.limit;
    console.log(limit);
    console.log(skip);

    const response = await getController.get(link, skip, limit);

    if (response.err == null) {
        res.status(200).json({ doc: response });
    } else {
        res.status(400).json(response);
    }
});

router.get("/get/Date", async(req, res, next) => {
    console.log(req.query.site);
    var link = req.query.site;
    var start = req.query.start;
    var end = req.query.end;
    console.log(start);
    console.log(end);

    const response = await getController.getByDate(link, start, end, req, res);

    if (response.err == null) {
        res.status(200).json({ doc: response });
    } else {
        res.status(400).json(response);
    }
});

router.get("/get/follow", async(req, res, next) => {
    console.log(req.query.site);
    var link = req.query.site;
    var start = req.query.start;
    var end = req.query.end;
    console.log(start);
    console.log(end);

    const response = await getController.getdoFollowByDate(req, res);
    // console.log(response)
});

router.get("/search", async(req, res, next) => {
    const response = await getController.searchByMainLink(req, res);
});
router.post("/check", allAuth, async(req, res, next) => {
    const response = await getController.checked(req, res);
});
router.get("/getHistory", async(req, res, next) => {
    const response = await getController.getHistory(req, res);
});

router.get("/downloadAll", async(req, res, next) => {
    const response = await getController.getAll(req, res);
});
router.get("/downloadSkip", async(req, res, next) => {
    const response = await getController.getBySkip(req, res);
});
router.get("/downloadByDate", async(req, res, next) => {
    const response = await getController.DownloadByDate(req, res);
});

router.get("/algo2", async(req, res, next) => {
    res.render("index", { title: "Express" });
});

router.get("/algo3", async(req, res, next) => {
    res.render("index", { title: "Express" });
});


module.exports = router;