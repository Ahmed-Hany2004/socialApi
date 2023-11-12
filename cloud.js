const cloudinary =require("cloudinary");
require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.cloud_key,
    api_secret: process.env.cloud_secrit
})

cloud_uplod = async(filetouploud)=>{
try{
    const data = cloudinary.uploader.upload(filetouploud,{
        resours_type:"auto",
    });
    return data; 

}catch(err){
    return err;
}
}



cloud_remove = async(publicid)=>{
    
    try{
    
        const data = await cloudinary.uploader.destroy(publicid);
        
        return data; 
    
    }catch(err){
        return err;
    }
    }

    module.exports={
       cloud_uplod,
       cloud_remove
    };