const mongoose = require("mongoose");

const connectDB = async (MONGO_URI) => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(" MongoDB connected successfully");
  } catch (error) {
    console.error(" MongoDB connection failed:", error.message);
    process.exit(1); 
  }
};

module.exports = connectDB;
