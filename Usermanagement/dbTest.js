require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Organization = require("./models/Organization");

async function testDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" MongoDB Connected!");
    const org = await Organization.create({
      name: "Test Organization",
      domain: "testorg.com",
      createdBy: new mongoose.Types.ObjectId(), 
    });

    
    const user = await User.create({
      name: "John Doe",
      email: "john@example.com",
      passwordHash: "hashedpassword123", 
      role: "super_admin", 
      organizationId: org._id,
      totpEnabled: false,
    });

    console.log(" User Created:", user);
    console.log(" Organization Created:", org);

    // Disconnect
    await mongoose.disconnect();
    console.log(" Disconnected from DB");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testDB();
