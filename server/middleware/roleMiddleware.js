/**
 * Middleware to restrict routes to teachers only
 */
exports.teacherOnly = (req, res, next) => {
  if (req.user.userType !== "teacher") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Teachers only.",
    });
  }
  next();
};

/**
 * Middleware to restrict routes to students only
 */
exports.studentOnly = (req, res, next) => {
  if (req.user.userType !== "student") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Students only.",
    });
  }
  next();
};

/**
 * Middleware to restrict routes to admins only
 */
exports.adminOnly = (req, res, next) => {
  if (req.user.userType !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }
  next();
};

/**
 * Middleware to check if user is either an admin or the resource owner
 * Requires a getResource function to be passed that returns the resource
 *
 * @param {Function} getResource - Function that retrieves the resource and returns it
 * @param {String} ownerField - The field name that contains the owner ID (default: 'createdBy')
 */
exports.ownerOrAdmin = (getResource, ownerField = "createdBy") => {
  return async (req, res, next) => {
    try {
      const resource = await getResource(req);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      // Check if user is admin or the owner
      if (
        req.user.userType === "admin" ||
        resource[ownerField].toString() === req.user.id
      ) {
        // Add the resource to the request object for later use
        req.resource = resource;
        return next();
      }

      return res.status(403).json({
        success: false,
        message:
          "Access denied. You don't have permission to access this resource.",
      });
    } catch (error) {
      console.error("Error in ownerOrAdmin middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while checking permissions",
      });
    }
  };
};
