require('mongoose')
const bcrypt = require("bcryptjs");
const userSchema = require('../model/user')

// Register a user and add the respective details to database
module.exports.register = async(req, res) => {
    let { name, email, password } = req.body;
    let user = await userSchema.findOne({
        email: { $regex: `^${email}$`, $options: "i" },
    });

    // Reject if mail already in use
    if (user) {
        res.status(400).json({
            message: "Email already in use.",
            error: true,
            data: null,
        });
    } else {
        // Reject if password is too weak
        if (password.length < 8) {
            res.status(403).json({
                message: "Password atleast of 8 characters",
                error: true,
                data: null,
            });
        } else {
            let newUser = {
                name: String(name).trim(),
                email: String(email).trim(),
            };

            // Store credentials in databse and generate a auth token
            const salt = await bcrypt.genSalt(10);
            newUser["password"] = await bcrypt.hash(password, salt);
            user = await userSchema.create(newUser);
            let token = user.generateAuthToken();
            res.status(200).header("x-auth-token", token).json({
                message: "Successfully Registered",
                error: false,
                data: user,
            });
        }
    }
};

// Login to a registered account
module.exports.login = async(req, res) => {
    let { email, password } = req.body;
    let user = await userSchema.findOne({
        email: { $regex: `^${email}$`, $options: "i" },
    });

    // Validate the email
    if (user) {
        // Check hashed password 
        let validPassword = await bcrypt.compare(
            String(password),
            String(user.password)
        );
        if (!validPassword) {
            return res.status(403).json({
                message: "Invalid password",
                error: true,
            });
        } else {
            let token = user.generateAuthToken();
            res.status(200).header("x-auth-token", token).json({
                message: "Login Successful",
                error: null,
                data: user,
            });
        }
    } else {
        res.status(401).json({
            message: "Invalid User",
            error: true,
            data: null,
        });
    }
};

// get profile data of a user.
module.exports.profile = async(req, res) => {
    let user = await userSchema.findById(req.user.id);
    if (user) {
        res.status(200).json({ message: "success", error: false, data: user });
    } else {
        res.status(400).json({
            message: "No User found",
            error: true,
            data: null,
        });
    }
};

// Delete a user
module.exports.deleteProfile = async(username) => {
    try {
        const removed = await userSchema.findOneAndDelete({ email: username })
        return { doc: removed }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}

// Get a list of all users
module.exports.getUsers = async() => {
    try {
        const main = await userSchema.find({}).sort({ createdAt: 'desc' })
            // console.log(main)
        return { doc: main }
    } catch (e) {
        console.log(e)
        return { err: e, status: false }
    }
}