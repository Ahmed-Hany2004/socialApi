const joi =require("joi");


const userschema = joi.object({
   username:joi.string().trim().min(3).max(20).required(),
   password:joi.string().trim().min(3).max(20).required(),
   email:joi.string().trim().min(3).max(20),
   
})


const userupdateschema  = joi.object({
   username:joi.string().trim().min(3).max(20).required(),
   bio:joi.string().trim().min(3).max(200),
})


module.exports={
userschema,
userupdateschema
}