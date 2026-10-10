const express = require("express");

const {requireAuth} = require("../middleware/auth");
const {searchUsers} = require("../controllers/userController");

const router = express.Router();

router.get("/search", requireAuth, searchUsers);

router.post('/about',(req,res)=>{
    try{
        let username = req.body.username;
        res.json({message: `hii this is about page${username}`});
    }catch(err){
        throw err;
    }
})

module.exports = router;


