const router = require("express").Router();
const homeController = require("../controller/home");

// Home "GET"
router.get("/", homeController.get);

module.exports = router;
