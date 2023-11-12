const jwt = require("jsonwebtoken");



 verifytokenx =(req,res,next)=>{
    token =req.headers.token;
    if(token){
        try{
            
            const data =  jwt.verify(token,process.env.secritkey)
            req.user= data;

            next();
              }catch(err){
            res.status(401).json({message:"invalid token"})
        }

    }else{
       res.status(401).json({message:"invalid token"})
    }

};

sddfg =(req,res,next)=>{
    token =req.headers.token;
    if(token){
        try{
            console.log("Herer")
            const data =  jwt.verify(token,process.env.secritkey)
            req.user= data;
            console.log("Token data ",data)
            next();

        }catch(err){
            res.status(401).json({message:"invalid token"})
        }

    }else{
        console.log("no token")
       res.status(401).json({message:"invalid token"})
    }
    // console.log("zz :",zz)
    // if(zz== "true"){
    //     console.log("1015");
    // next()
    // }else{
    //     res.status(401).json({message:"invalid token"})
    // }
}
module.exports= {
    verifytokenx,
    sddfg,
};