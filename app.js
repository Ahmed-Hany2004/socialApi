const express = require("express");
const morgan = require("morgan");
const { main, db } = require("./connection");
const bodyparser = require("body-parser");
const { sddfg } = require("./token")
const jwt = require("jsonwebtoken");
var cors = require('cors')

const app = express();

app.use(morgan("dev"));
app.use(bodyparser.urlencoded({ extended: true }))
app.use(bodyparser.json())

app.use(cors())

//routes
app.get("/", async (req, res) => {
   const token = req.headers.token


   const post = db.collection("post")
   const page = req.query.page;
   const limit = Number(req.query.limit) ;
   try {





      x = await post.aggregate([
         { $skip: (page - 1) * limit },
         { $limit: Number(limit) },
         {
            $lookup:
            {
               from: "users",
               localField: "author_id",
               foreignField: "_id",
               as: "author"
            },
         },
         { $project: { comments_id: 0, author_id: 0, "author.pass": 0, "author.isAdmin": 0, "author.cover": 0, "author.bio": 0 } },
         { $sort : { created_at : -1 } }

      ]).toArray()
    
      req.user = null;
      if (token) {
         const data =  jwt.verify(token,process.env.secritkey)
         req.user= data.id;
      };

      for (let i = 0; i < x.length; i++) {


         chek = x[i].like.includes(req.user)

         if (chek) {
            x[i]["beliked"] = true;
         } else {
            x[i]["beliked"] = false;
         }



         delete x[i].like
      }




      
      
      res.status(200).json({ data: x })

   } catch (err) {
      console.log("=========>" + err);
      res.status(500).send("err")
   }

})


const userpath = require("./routes/userRoute")
const postpath = require("./routes/postroute")



app.use("/users", userpath);
app.use("/posts", postpath);


//connection to DB
main(app);









