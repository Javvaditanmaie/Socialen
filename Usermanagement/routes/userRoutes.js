const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createUserValidator,
  updateUserValidator,
  getUsersValidator,
} = require("../validators/userValidator");
const { validationResult } = require("express-validator");
function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}


router.get(
  "/",
  authenticate,
  roleMiddleware(["super_admin", "site_admin"]),
  getUsersValidator,
  runValidation,
  userController.listUsers
);

router.get(
  "/:id",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "client_admin", "operator"]),
  userController.getUser
);

router.post(
  "/",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "client_admin"]),
  createUserValidator,
  runValidation,
  userController.createUser
);


router.put(
  "/:id",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "client_admin"]),
  updateUserValidator,
  runValidation,
  userController.updateUser
);

router.delete(
  "/:id",
  authenticate,
  roleMiddleware(["super_admin", "site_admin"]),
  userController.deleteUser
);

module.exports = router;
