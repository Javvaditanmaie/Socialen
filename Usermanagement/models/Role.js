// const mongoose=require("mongoose")
// const RoleSchema=new mongoose.Schema(
//     {
//         name:{
//             type:String,
//             required:true,
//             unique:true,
//             trim:true,
//             enum:[
//                 "super_admin",
//                 "site_admin",
//                 "operator",
//                 "client_admin",
//                 "client-user",
//             ],
//         },
//         description:{
//             type:String,
//             defalut:"",

//         },
//     },
//     {timestamps:true}
// )
// RoleSchema.index({ name: 1 });

// const Role = mongoose.model("Role", RoleSchema);
// module.exports = Role;