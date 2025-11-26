import redis from '../utils/redis.js'
export const generateOTP=async(email)=>{
    const otp=Math.floor(100000+Math.random()*900000).toString();
    await redis.set(`otp:${email}`,otp,{EX:300});
    return otp;
}
export const verifyOTPService=async(email,userOtp)=>{
    email =email.trim().toLowerCase();
    const key=`otp:${email}`
    const savedOtp=await redis.get(key);
    if(!savedOtp){
        return {
            valid:false, message:"otp expired or not found"
        }
    }
    if(savedOtp==userOtp){
        await redis.del(key)
        return {valid:true}
    }
    return {valid:false,message:"incorrect otp"}
}