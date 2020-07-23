var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var cors = require("cors");
var bodyParser = require("body-parser");
var indexRouter = require("./routes/index");
var userController = require("./routes/user");
const serveIndex = require('serve-index');

var app = express();
db = async() => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scrapper'
        const con = await mongoose.connect(mongoUri, { useFindAndModify: true, useNewUrlParser: true, useCreateIndex: true });
        if (con) {
            console.log("Connected Successfull !");
        }
    } catch (err) {
        console.log("Not Connected Err:-" + err);
    }
};
db();
app.use(cors({ exposedHeaders: "x-auth-token" }));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/ftp', express.static('public'), serveIndex('public', { 'icons': true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));

//load Schema
const User = require("./model/user");

// Automated crawling of sitemaps
const Scheduler = require('./scheduler/schedule')
setTimeout(Scheduler.crawlerLoop, 20000)
setTimeout(Scheduler.schedulerLoop, 10000)

//Routes
app.use("/", indexRouter);
app.use("/users", userController);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;