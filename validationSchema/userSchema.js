const joi =require("joi");


const userschema = joi.object({
   username:joi.string().trim().min(3).max(20).required(),
   password:joi.string().trim().min(3).max(20).required(),
   email:joi.string().trim().min(3),
   
})


const userupdateschema  = joi.object({
   username:joi.string().trim().min(3).max(20).required(),
   bio:joi.string.trim().max(200),
   email:joi.string().trim(),
})


module.exports={
userschema,
userupdateschema
}