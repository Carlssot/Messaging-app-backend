import dotenv from "dotenv";
dotenv.config();
//import the mongoose library for easier mongoDB schemas
import mongoose from "mongoose";

// async tells caller to wait until completion
// create a pipeline to a mongoDB
const connectDB = async () => {
  await mongoose
    .connect(process.env.DATABASE_URL)
    .then(() => console.log(`Mongo connected: ${mongoose.connection}`))
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
};

export { connectDB };
