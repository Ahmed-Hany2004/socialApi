const express = require("express");
const { db } = require("../connection");
const jwt = require("jsonwebtoken");
const { upload } = require("../multerfunction")
const path = require("path")
const { cloud_remove, cloud_uplod } = require("../cloud")
const fs = require("fs");
const { ObjectId } = require("mongodb");
const { postSchema } = require("../validationSchema/posrSchema");
const { log } = require("console");




const router = express.Router();



router.get("/:id", async (req, res) => {
  const post = db.collection("post");
  const token = req.headers.token
  try {

    x = await post.aggregate([
      { $match: { "_id": new ObjectId(req.params.id) } },
      {
        $lookup:
        {
          from: "users",
          localField: "author_id",
          foreignField: "_id",
          as: "author"
        }
      }, {
        $lookup: {
          from: "comment",
          let: { "comments_id": "$comments_id" },
          pipeline: [{ $match: { $expr: { $in: ["$_id", "$$comments_id"] } } },
          {
            $lookup: {
              from: "users",
              let: { "author_id": "$author_id" },
              pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$author_id"] } } }],
              as: "author"
            }
          }

          ],
          as: "comment"
        }
      },
      {
        $project: {
          comments_id: 0, author_id: 0, "author.pass": 0, "author.isAdmin": 0, "author.cover": 0, "author.bio": 0,
          "comment.author_id": 0, "comment.author.pass": 0, "comment.author.cover": 0, "comment.author.bio": 0, "comment.author.isAdmin": 0
        }
      }
    ]).toArray()

    req.user = null;
    if (token) {
      const data = jwt.verify(token, process.env.secritkey)
      req.user = data.id;


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

router.post("/create", upload.single("postimg"), async (req, res) => {

  const post = db.collection("post");
  const user = db.collection("users");
  const token = req.headers.token
  req.user = null;
  if (token) {

    data = jwt.verify(token, process.env.secritkey);
    req.user = data;

  } else {
    return res.status(400).json({ messege: "you not login " })
  }

  try {
    const { error } = postSchema.validate(req.body);





    if (error) {

      if (error.details[0].message == "\"postimg\" is not allowed") {
        post.insertOne({
          title: req.body.title,
          body: req.body.body,
          author_id: new ObjectId(req.user.id),
          image: {
            "url": null,
            "publicid": null,
            "originalname": null,
          },
          created_at: Date.now(),
          comments_count: 0,
          comments_id: [],
          likecount: 0,
          like: [],
        })
        await user.updateOne({ "_id": new ObjectId(req.user.id) }, { $inc: { "posts_count": +1 } })
        return res.status(200).json({ messege: "post created Succeed" })
      }
      return res.status(400).json({ messege: error.details[0].message })
    }

    postpath = path.join(__dirname, "../upload/" + req.file.originalname);

    result = await cloud_uplod(postpath);

    post.insertOne({
      title: req.body.title,
      body: req.body.body,
      author_id: new ObjectId(req.user.id),
      image: {
        "url": result.secure_url,
        "publicid": result.public_id,
        "originalname": req.file.originalname,
      },
      created_at: Date.now(),
      comments_count: 0,
      comments_id: [],
      likecount: 0,
      like: [],
    })
    res.status(200).json({ messege: "post created Succeed" })
    await user.updateOne({ "_id": new ObjectId(req.user.id) }, { $inc: { "posts_count": +1 } })

    fs.unlinkSync(postpath)

  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})


router.put("/:id", upload.single("postimg"), async (req, res) => {
  const post = db.collection("post");
  const token = req.headers.token
  req.user = null;

  if (token) {
    data = jwt.verify(token, process.env.secritkey)
    req.user = data
  } else {
    return res.status(400).json({ messege: "you not login " })
  }
  try {
    x = await post.findOne({ "_id": new ObjectId(req.params.id) })

    if (x.author_id != req.user.id) {
      return res.status(403).json({ messege: "yor are not allaowed" })
    }
   
    const { error } = postSchema.validate(req.body);
    if (error) {

      if (error.details[0].message == "\"postimg\" is not allowed") {
        cloud_remove(x.image.publicid)
        await post.updateOne({ "_id": new ObjectId(req.params.id) }, {
          $set: {
            "title": req.body.title, "body": req.body.body, "image": {
              "url": null,
              "publicid": null,
              "originalname": null,
            }
          }
        })
        return res.status(200).json({ message: "update Succeed" })

      }
      return res.status(400).json({ messege: error.details[0].message })
    }
    const pathimge = path.join(__dirname, "../upload/" + req.file.originalname)

    if (x.image.originalname == req.file.originalname) {
      await post.updateOne({ "_id": new ObjectId(req.params.id) }, { $set: { "title": req.body.title, "body": req.body.body, } })
      fs.unlinkSync(pathimge)
      return res.status(200).json({ message: "update Succeed" })
    }



    result = await cloud_uplod(pathimge)

    if (x.image.publicid !== null) {
      cloud_remove(x.image.publicid)
    }

    await post.updateOne({ "_id": new ObjectId(req.params.id) }, {
      $set: {
        "title": req.body.title, "body": req.body.body, "image": {
          "url": result.secure_url,
          "publicid": result.public_id,
          "originalname": req.file.originalname,
        }
      }
    })

    res.status(200).json({ message: "update Succeed" })

    fs.unlinkSync(pathimge)


  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})




router.delete("/:id", async (req, res) => {

  const post = db.collection("post");

  const user = db.collection("users");
  const token = req.headers.token
  req.user = null;

  if (token) {
    data = jwt.verify(token, process.env.secritkey)
    req.user = data
  } else {
    return res.status(400).json({ messege: "you not login " })
  }
  try {
    x = await post.findOne({ "_id": new ObjectId(req.params.id) })

    if(x.author_id == req.user.id || req.user.isAdmin == true){


          if (x.image.publicid != null) {
      cloud_remove(x.image.publicid)
    }


    await user.updateOne({ "_id": new ObjectId(x.author_id) }, { $inc: { "posts_count": -1 } })

    await post.deleteOne({ "_id": new ObjectId(req.params.id) })

   return res.status(200).json({ message: "post deleted" })
    }

    return res.status(403).json({ messege: "yor are not allaowed" })
    
    

  }
  catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }

});


router.post("/like/:id", async (req, res) => {
  const post = db.collection("post");
  const token = req.headers.token
  const like = req.headers.like
  req.user = null;

  if (token) {
    data = jwt.verify(token, process.env.secritkey)
    req.user = data
  }
  else {
    return res.status(400).json({ messege: "you not login " })
  }
  try {
    if (like) {

      await post.updateOne({ "_id": new ObjectId(req.params.id) }, { $addToSet: { "like": req.user.id }, $inc: { "likecount": +1 } })
      res.status(200).json({ message: "complite" })

    } else {
      await post.updateOne({ "_id": new ObjectId(req.params.id) }, { $pull: { "like": req.user.id }, $inc: { "likecount": -1 } })
      res.status(200).json({ message: "complite" })
    }
  }
  catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }

});

router.post("/:id/comments", async (req, res) => {
  const comments = db.collection("comment");
  const post = db.collection("post");
  const user = db.collection("users");

  const token = req.headers.token
  req.user = null;
  const comment = req.body.body
  const created_at = Date.now()

  if (token) {
    data = jwt.verify(token, process.env.secritkey)
    req.user = data
  }
  else {
    return res.status(400).json({ messege: "you not login " })
  }

  try {

    await comments.insertOne({
      "comment": comment,
      "created_at": created_at,
      "author_id": new ObjectId(req.user.id),
    })


    x = await comments.findOne({ "author_id": new ObjectId(req.user.id), "created_at": created_at });

    await post.updateOne({ "_id": new ObjectId(req.params.id) }, { $push: { "comments_id": new ObjectId(x._id) }, $inc: { "comments_count": +1 } })

    await user.updateOne({ "_id": new ObjectId(req.user.id) }, { $inc: { "comments_count": +1 } })

    res.status(200).json({ message: "complite" })


  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }

})


module.exports = router;