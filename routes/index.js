var express = require('express');
var router = express.Router();
var algo1Controller = require('../controller/algo1Controller');
var getController = require('../controller/getController');
var masterController = require('../controller/masterController');


/* GET home page. */
router.post('/algo1', async (req, res, next) => {
  const response = await algo1Controller.algo1(req)
  res.status(200).json({ doc: response });
});

router.post('/master', async (req, res, next) => {
  const response = await masterController.insert(req);
  if (response.err == null)
    res.status(200).json(response);
  else {
    res.status(400).json(response);

  }
});

router.get('/master', async (req, res, next) => {
  const response = await masterController.getAll();
  res.status(200).json(response);
});


router.get('/get/algo1', async (req, res, next) => {
  console.log(req.query.site);
  var link = req.query.site;
  var skip = req.query.skip;
  var limit = req.query.limit;
  console.log(limit);
  console.log(skip);


  const response = await getController.get(link, skip, limit)

  if (response.err == null) {
    res.status(200).json({ doc: response });
  }
  else {
    res.status(400).json(response);
  }
});

router.get('/get/Date', async (req, res, next) => {
  console.log(req.query.site);
  var link = req.query.site;
  var start = req.query.start;
  var end = req.query.end;
  console.log(start);
  console.log(end);

  const response = await getController.getByDate(link, start, end)

  if (response.err == null) {
    res.status(200).json({ doc: response });
  }
  else {
    res.status(400).json(response);
  }
});


router.get('/get/follow', async (req, res, next) => {
  console.log(req.query.site);
  var link = req.query.site;
  var start = req.query.start;
  var end = req.query.end;
  console.log(start);
  console.log(end);

  const response = await getController.getdoFollowByDate(req, res)
});

router.get('/search', async (req, res, next) => {
  const response = await getController.searchByMainLink(req, res)
});
router.post('/check', async (req, res, next) => {
  const response = await getController.checked(req, res)
});
router.get('/getHistory', async (req, res, next) => {
  const response = await getController.getHistory(req, res)
});

router.get('/algo2', async (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.get('/algo3', async (req, res, next) => {
  res.render('index', { title: 'Express' });
});


module.exports = router;

