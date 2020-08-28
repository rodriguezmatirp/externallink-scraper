const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
    },
    {timestamps: true}
);

userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id,
            name: this.name,
            email: this.email,
        },
        process.env.JWT_PRIVATE_KEY
    );
};

module.exports = User = mongoose.model("User", userSchema);
