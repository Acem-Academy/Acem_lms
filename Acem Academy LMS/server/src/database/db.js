const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log("✅ MongoDB Connected");
        console.log(`📂 Database: ${connection.connection.name}`);
        console.log(`🖥️ Host: ${connection.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB Connection Failed");
        console.error(error.message);
        process.exit(1);
    }
};

mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB connection disconnected.");
});

mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB connection re-established.");
});

module.exports = connectDB;
