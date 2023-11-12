const joi =require("joi");


 const postSchema = joi.object({
    title:joi.string().trim().min(3).max(25).required(),
    body:joi.string().trim().min(3).max(150).required(),
 })


 module.exports={
    postSchema,
 }