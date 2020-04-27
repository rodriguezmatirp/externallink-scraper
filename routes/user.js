const express = require("express");
const router = express.Router();

const { register, login, profile } = require("../controller/userController");

const { catchErrors } = require("../config/errorHandler");
const { allAuth } = require("../middlewares/auth");
const { userValidation } = require("../middlewares/validation");

//routes
router.post("/register", userValidation, catchErrors(register));
router.post("/login", catchErrors(login));
router.get("/profile", allAuth, catchErrors(profile));

module.exports = router;
