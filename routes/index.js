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
  res.status(200).json({ status: true, doc: response });
});

router.get('/master', async (req, res, next) => {
  const response = await masterController.getAll();
  res.status(200).json({ status: true, doc: response });
});


router.get('/get/algo1', async (req, res, next) => {
  console.log(req.query.site);
  var link = req.query.site;
  var skip = req.query.skip;
  var limit = req.query.limit;
  console.log(limit);
  console.log(skip);


  const response = await getController.get(link, skip, limit)
  res.status(200).json({ status: true, doc: response });
});

router.get('/algo2', async (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.get('/algo3', async (req, res, next) => {
  res.render('index', { title: 'Express' });
});


module.exports = router;
