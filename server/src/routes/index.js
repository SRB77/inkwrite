const express = require("express");
const userRoutes = require('./userRoutes');
const whiteboardRoutes = require('./whiteboardRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.get('/healthcheck',(req,res)=> res.json({status:"ok"}));
router.use("/auth", authRoutes);
router.use("/users",userRoutes); 
router.use("/whiteboards", whiteboardRoutes)

module.exports = router;
