var express = require('express');
var router = express.Router();
var algo1Controller = require('../controller/algo1Controller');
var getController = require('../controller/getController');

/* GET home page. */
router.post('/algo1', async (req, res, next) => {
  const response = await algo1Controller.algo1(req)
  res.status(200).json({ t: response });
});

router.get('/get/algo1/:skip/:limit', async (req, res, next) => {
  var skip = req.params.skip;
  console.log(req.query.site);

  var limit = req.params.limit
  const response = await getController.get(req, skip, limit)
  res.status(200).json({ doc: response });
});

router.get('/algo2', async (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.get('/algo3', async (req, res, next) => {
  res.render('index', { title: 'Express' });
});


module.exports = router;

