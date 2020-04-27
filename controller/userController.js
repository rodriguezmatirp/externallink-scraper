const bcrypt = require("bcryptjs");

module.exports.register = async (req, res) => {
  let { name, email, password } = req.body;
  let user = await User.findOne({
    email: { $regex: `^${email}$`, $options: "i" },
  });
  if (user) {
    res.status(400).json({
      message: "Email already in use.",
      error: true,
      data: null,
    });
  } else {
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
      const salt = await bcrypt.genSalt(10);
      newUser["password"] = await bcrypt.hash(password, salt);
      user = await User.create(newUser);
      let token = user.generateAuthToken();
      res.status(200).header("x-auth-token", token).json({
        message: "Successfully Registered",
        error: false,
        data: user,
      });
    }
  }
};

module.exports.login = async (req, res) => {
  let { email, password } = req.body;
  let user = await User.findOne({
    email: { $regex: `^${email}$`, $options: "i" },
  });
  if (user) {
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

module.exports.profile = async (req, res) => {
  let user = await User.findById(req.user.id);
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
