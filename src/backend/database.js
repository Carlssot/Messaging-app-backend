import dotenv from "dotenv";
dotenv.config();
//import the mongoose library for easier mongoDB schemas
import mongoose from "mongoose";

// ----- Schemas for objects:

//Because schemas have reference to other objects ids
// the populate method must be used
// message = await message.findById(messageId).populate('sender')

//-- User schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  //image: {type:File},
  profileSetup: { type: Boolean, default: false },
  color: { type: String, default: "#189B3F" },
  //contacts is an array of referenes to the user object in DB
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

//-- Message schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  chatroom: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" },
  content: String,
  timeStamp: { type: Date, default: Date.now },
});

//-- Chatroom schema
const chatroomSchema = new mongoose.Schema({
  name: String,
  timeCreated: { type: Date, default: Date.now },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

// ----- Create the mongoDB models
const User = mongoose.model("User", userSchema);
const ChatRoom = mongoose.model("ChatRoom", chatroomSchema);
const Message = mongoose.model("Message", messageSchema);

// async tells caller to wait until completion
// create a pipeline to a mongoDB
const connectDB = async () => {
  await mongoose
    .connect(process.env.DATABASE_URL)
    .then(() => console.log(`Mongo connected: ${mongoose.connection}`))
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(500);
    });
};

export { connectDB, User, ChatRoom, Message };
