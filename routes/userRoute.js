const express = require("express");
const { db } = require("../connection");
const jwt = require("jsonwebtoken");
const { userschema, userupdateschema } = require("../validationSchema/userSchema");
const { upload } = require("../multerfunction")
require("dotenv").config();
const path = require("path")
const { cloud_remove, cloud_uplod } = require("../cloud")
const fs = require("fs");
const verifytoken = require("../token")
const { ObjectId } = require("mongodb");


const router = express.Router()


router.get("/:id", async (req, res) => {

  const user = db.collection('users');

  new_user = await user.findOne({ "_id": new ObjectId(req.params.id) });

  const token = jwt.sign({ id: new_user._id, isAdmin: new_user.isAdmin }, process.env.secritkey);
  delete new_user.isAdmin
  delete new_user.pass

  res.status(200).json({ data: { new_user }, token })

});


router.post("/register", upload.single("img"), async (req, res) => {
  const user = db.collection('users');

  username = req.body.username
  pass = req.body.password
  email = req.body.email
  try {
    const { error } = userschema.validate(req.body);
    x = await user.findOne({ "username": username });
    if (x) {

      return res.status(400).json({ message: "this user already registered" })
    }




    if (error) {

      if (error.details[0].message == "\"img\" is not allowed") {


        z = await user.insertOne({
          "username": username,
          "pass": pass,
          "email": email,
          "isAdmin": false,
          "profile_image": {
            "url": null,
            "image_publicid": null,
            "originalname": null,
          },
          "bio": null,
          "cover": {
            "url": null,
            "image_publicid": null,
            "originalname": null,
          },
          "count_post": null,
          "count_comment": null,
        })

        new_user = await user.findOne({ "username": username });

        const token = jwt.sign({ id: new_user._id, isAdmin: new_user.isAdmin }, process.env.secritkey);

        delete new_user.isAdmin
        delete new_user.pass

        return res.status(201).json({ message: "registered in Succeed", new_user, token })
      }
      return res.status(400).json({ message: error.details[0].message })


    }


    // if user send img 

    const pathimg = path.join(__dirname, "../upload/" + req.file.originalname)

    const result = await cloud_uplod(pathimg)



    await user.insertOne({
      "username": username,
      "pass": pass,
      "email": req.body.email,
      "isAdmin": false,
      "profile_image": {
        "url": result.secure_url,
        "image_publicid": result.public_id,
        "originalname": req.file.originalname,
      },
      "bio": null,
      "cover": {
        "url": null,
        "image_publicid": null,
        "originalname": null,
      },
      "posts_count": 0,
      "comments_count": 0,
    })

    new_user = await user.findOne({ "username": username });

    const token = jwt.sign({ id: new_user._id, isAdmin: new_user.isAdmin }, process.env.secritkey);

    fs.unlinkSync(pathimg)

    delete new_user.isAdmin
    delete new_user.pass

    return res.status(201).json({ message: "registered in Succeed", new_user, token })


  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }


});

router.post("/login", async (req, res) => {

  const user = db.collection('users');
  try {
    const { error } = userschema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }
    test = await user.findOne({ "username": req.body.username })


    if (test) {
      if (test.pass == req.body.password) {
        const token = jwt.sign({ id: test._id, isAdmin: test.isAdmin }, process.env.secritkey);

        delete test.isAdmin
        delete test.pass
        res.status(200).json({ message: "Sign in Succeed", test, token })
      }
      else {
        res.status(400).json({ message: "invalid user name or pass" })
      }
    }
    else {
      res.status(400).json({ message: "invalid user name or pass" })
    }


  } catch (err) {
    console.log("=========>" + err);
    res.send("err")
  }

});


router.get("/:id/posts", async (req, res) => {
  post = db.collection('post')
  const token = req.headers.token

  try {

    x = await post.aggregate([
      { $match: { "author_id": new ObjectId(req.params.id) } },
      {
        $lookup:
        {
          from: "users",
          localField: "author_id",
          foreignField: "_id",
          as: "author"
        }
      },
      { $project: { comments_id: 0, author_id: 0, "author.pass": 0, "author.isAdmin": 0, "author.cover": 0, "author.bio": 0 } },
      { $sort : { created_at : -1 } }
      ,]).toArray()
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
  //اعملها بعدين عشان هتحتاج تعرف تقسم البوست ازاى 
});


router.put("/data/:id", verifytokenx, async (req, res) => {


  try {
    newdata = req.body;

    if (req.user.id != req.params.id) {
      return res.status(403).json({ message: "yor are not allaowed" })
    }


    const user = db.collection('users');

    const { error } = userupdateschema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const unickname = await user.findOne({ "username": req.body.username })

    const myname = await user.findOne({ "_id": new ObjectId(req.user.id) })

    if (unickname) {

      if (unickname.username == myname.username) {
        await user.updateOne({ "_id": new ObjectId(req.params.id) }, { $set: { "username": req.body.username, "bio": req.body.bio } })

        return res.status(200).json({ message: "update Succeed" })
      }
      else {
        return res.status(400).json({ message: "this user already registered" })
      }

    }
    await user.updateOne({ "_id": new ObjectId(req.params.id) }, { $set: { "username": req.body.username, "bio": req.body.bio } })

    res.status(200).json({ message: "update Succeed", })
  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
});




router.post("/profileimg", upload.single("profileimg"), async (req, res) => {
  token = req.headers.token;
  req.user = null;
  const user = db.collection('users');
  try {

    if (token) {

      const data = jwt.verify(token, process.env.secritkey)
      req.user = data;

    } else {
      return res.status(401).json({ message: "invalid token" })
    }


    const loginuser = await user.findOne({ "_id": new ObjectId(req.user.id) })


    if (req.user.id != loginuser._id) {
      return res.status(403).json({ message: "yor are not allaowed" })
    }

    if (!req.file) {
      return res.status(403).json({ message: "you not send img" })
    }
    const pathimge = path.join(__dirname, "../upload/" + req.file.originalname)

    if (loginuser.profile_image.originalname == req.file.originalname) {
      fs.unlinkSync(pathimge)
      return res.status(200).json({ message: "upload img Succeed" })
    }




    result = await cloud_uplod(pathimge)

    if (loginuser.profile_image.image_publicid !== null) {
      cloud_remove(loginuser.profile_image.image_publicid)

    }

    await user.updateOne({ "_id": new ObjectId(req.user.id) }, {
      $set: {
        "profile_image": {
          "url": result.secure_url,
          "image_publicid": result.public_id,
          "originalname": req.file.originalname,
        }
      }
    })

    res.status(200).json({ message: "upload img Succeed" })

    fs.unlinkSync(pathimge)

  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})


router.post("/coverimg", upload.single("coverimg"), async (req, res) => {
  token = req.headers.token;
  req.user = null;
  const user = db.collection('users');
  try {

    if (token) {

      const data = jwt.verify(token, process.env.secritkey)
      req.user = data;

    } else {
      return res.status(401).json({ message: "invalid token" })
    }


    const loginuser = await user.findOne({ "_id": new ObjectId(req.user.id) })


    if (req.user.id != loginuser._id) {
      return res.status(403).json({ message: "yor are not allaowed" })
    }

    if (!req.file) {
      return res.status(403).json({ message: "you not send img" })

    }
    const pathimge = path.join(__dirname, "../upload/" + req.file.originalname)

    if (loginuser.cover.originalname == req.file.originalname) {
      res.status(200).json({ messege: "upload img Succeed" })
       fs.unlinkSync(pathimge)
      
       return  
    }




    result = await cloud_uplod(pathimge)

    if (loginuser.image_publicid !== null) {
      cloud_remove(loginuser.cover.image_publicid)
    }

    await user.updateOne({ "_id": new ObjectId(req.user.id) }, {
      $set: {
        "cover": {
          "url": result.secure_url,
          "image_publicid": result.public_id,
          "originalname": req.file.originalname,
        }
      }
    })

    res.status(200).json({ message: "upload img Succeed" })

    fs.unlinkSync(pathimge)

  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})


router.delete("/", async (req, res) => {
  try {
    if (token) {

      const data = jwt.verify(token, process.env.secritkey)
      req.user = data;

    } else {
      return res.status(401).json({ message: "invalid token" })
    }

    if (req.user.isAdmin == false) {
      return res.status(403).json({ message: "yor are not allaowed" })
    }

    const user = db.collection('users')
    res.status(200).json({ message: "suiiiiiiiiiiiiiiiii" })

    await user.deleteMany({});
  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})

router.delete("/profileimg", async (req, res) => {
  token = req.headers.token;
  const user = db.collection('users');
  try {
    if (token) {

      const data = jwt.verify(token, process.env.secritkey)
      req.user = data;

    } else {
      return res.status(401).json({ message: "invalid token" })
    }
    const loginuser = await user.findOne({ "_id": new ObjectId(req.user.id) })

    if (req.user.id != loginuser._id) {
      return res.status(403).json({ message: "yor are not allaowed" })
    }


    if (loginuser.profile_image.image_publicid !== null) {

      cloud_remove(loginuser.profile_image.image_publicid)
    }
    await user.updateOne({ "_id": new ObjectId(req.user.id) }, {
      $set: {
        "profile_image": {
          "url": null,
          "image_publicid": null,
          "originalname": null,
        }
      }
    })


    res.status(200).json({ message: "img deleted" })
  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})


router.delete("/coverimg", async (req, res) => {
  token = req.headers.token;
  const user = db.collection('users');
  try {
    if (token) {

      const data = jwt.verify(token, process.env.secritkey)
      req.user = data;

    } else {
      return res.status(401).json({ message: "invalid token" })
    }
    const loginuser = await user.findOne({ "_id": new ObjectId(req.user.id) })

    if (req.user.id != loginuser._id) {
      return res.status(403).json({ message: "yor are not allaowed" })
    }


    if (loginuser.cover.image_publicid !== null) {

      cloud_remove(loginuser.cover.image_publicid)
    }
    await user.updateOne({ "_id": new ObjectId(req.user.id) }, {
      $set: {
        "cover": {
          "url": null,
          "image_publicid": null,
          "originalname": null,
        }
      }
    })


    res.status(200).json({ message: "img deleted" })
  } catch (err) {
    console.log("=========>" + err);
    res.status(500).send("err")
  }
})

module.exports = router;
