const express = require("express");
const router = express.Router();

const { register, login, profile } = require("../controller/userController");

const { catchErrors } = require("../config/errorHandler");
const { allAuth } = require("../middlewares/auth");

//routes
router.post("/register", catchErrors(register));
router.post("/login", catchErrors(login));
router.get("/profile", allAuth, catchErrors(profile));

module.exports = router;
