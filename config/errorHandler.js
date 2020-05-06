module.exports.catchErrors = (middlewareFunction) => {
  return (req, res, next) => {
    middlewareFunction(req, res, next).catch((err) => {
      next(err);
    });
  };
};

// not found routes
module.exports.notFound = (req, res) => {
  res.status(404).json({
    message: "Welcome to API!! This route does not exist.",
  });
};
