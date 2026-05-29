const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `[Database Connected]: MongoDB Cloud Host: ${conn.connection.host}`,
    );
  } catch (error) {
    console.error(`[Database Error]: Connection Failed: ${error.message}`);
   
    process.exit(1);
  }
};

module.exports = connectDB;
