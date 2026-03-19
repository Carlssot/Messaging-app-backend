//import .env : .config() sets .env varibles to process.env
import dotenv from "dotenv";
dotenv.config();

// import express for HTTP server
import express from "express";
import http from "http";
import cors from "cors";
import sanitize from "mongo-sanitize";    //middle-ware to prevent injection attacks
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import {protect} from "./authentication.js";
import { User, Message, ChatRoom, connectDB } from "./database.js";
import {setupSocket} from "./sockets.js";

// create the server app
const app = express();
const server = http.createServer(app); //give full access to http server instance
//handle reques and responses in .json
app.use(express.json());

const PORT = process.env.PORT;

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // only allow request from this domain
    credentials: true, //Allow cookies and authentication headers in cross-origin requests
  }),
);

//Initialize the sockets
setupSocket(server);

//----- Endpoints for backend

//SINGUP
app.post("/api/auth/signup", async (req, res) => {
  // strip out any DB keys to prevent injection attacks
  req.body = sanitize(req.body);

  //Extract the user details from the req.body
  const { email, password } = req.body;
  //console.log("Signup request body:", req.body);

  //check if any of the fields are missing
  if (!email || !password ) {
    // 400: bad request code
    return res.status(400).json({ "message": `Missing required parameter in request` });
  }

  const exist = await User.findOne({email: email});
  if (exist) {
    return res.status(409).json({ "message": "Email already used" });
  }

  // hash the user password
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS, 10));
    const hash = await bcrypt.hash(password, salt);
    // create new user model with data
    const newUser = new User({
      email: email,
      password: hash,
      contacts: [],
    });

    // save the new user to the database
    await newUser.save()
      .then(() => console.log("user save successful"))
      .catch((err) => {
        console.error(`Error: ${err.message}`);
        return res.status(500).json({
          "message": "save fail",
        });
      });
    //not required to return res.status() since .json() send it to client
    res.status(201).json({
      "message": "signup successful",
      "user": {
        "email": email,
        "profileSetup": newUser.profileSetup,
      },
    });
  } catch (error) {
    console.log(`Error: ${error}`);
    res.status(500).json({
      "message": "hashing fail",
    });

  }
  return res;
});

//LOG-IN
app.post("/api/auth/login", async (req, res) => {
  try {
    // strip out any DB keys to prevent injection attacks
    req.body = sanitize(req.body);
    const {email, password} = req.body;

    //check if any of the fields are missing
    if (!email || !password) {
      // 400: bad request code
      return res.status(400).json({ "error": `Missing required parameter in request` });
    }

    //find the user in DB 
    const user = await User.findOne({email: email}).select('password profileSetup');
    if (!user) {
      return res.status(404).json();
    }

    //compare the passwords, user.password is hashed
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      return res.status(401).json();
    }
    //create JWT token
    const token = jwt.sign(
      {id: user._id},
      process.env.JWT_SECRET,
      {expiresIn: '30m'}    // options list 30 minute expiration
    );

    console.log("hash compare successful");
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true, // Required for Ngrok/Production
      sameSite: "None", // Required for cross-site cookies with Ngrok
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.status(200).json({
      "token": token,
     // "user" : {
     //   "email": email,
     //   "profileSetup": user.profileSetup,
     //   "color": user.color
     // }
      "user" : {
          "firstName": user.firstName || "", 
          "lastName": user.lastName || "",   
          "profileSetup": user.profileSetup, 
      }
    });
    
  } catch (err) {
    console.error('Error comparing passwords:', err);
    return res.status(400).json({"error": "Login Error"});
  }

});

app.post("/api/auth/logout", async (req, res) => {
  return res.status(200).json({
    "message" : "successful",
  });
});

app.get("/api/auth/userinfo/:ID" , async (req, res) => {
  const email = sanitize(req.params.ID);

  //check if any of the fields are missing
  if (email) {
    //find the information for the user
    const user = await User.findOne({email: email}).select('color email firstName lastName profileSetup');
    if (!user) {
      return res.satus(404).json({"message": "user not found"});
    }

    //user found, return object
    return res.status(200).json({
      "message" : "found successful",
      "user" : user
    });
  }

});

app.post("/api/auth/profile", async (req, res) => {
  req.body = sanitize(req.body);
  const {email, color, firstName, lastName} = req.body;
  //check if any of the fields are missing
  try {
    const updateDoc = await User.findOne({email: email});
    if (updateDoc) {
      updateDoc.color = newColor;
      updateDoc.firstName = firstName;
      updateDoc.lastName = lastName;
      await updateDoc.save();
    }
  } catch (err) {
    return res.status(500).json({ "message": "error updating profile" });
    console.error(err);
  }

});

//update the profile of the user, Name, lastName, or color
app.post("/api/auth/update-profile", async (req, res) => {
  req.body = sanitize(req.body);
  const {email, color, firstName, lastName} = req.body;
  console.log(req.body);
  //check if any of the fields are missing
  try {
    const updateDoc = await User.findOne({email: email});
    if (updateDoc) {
      if(color){
        updateDoc.color = newColor;
      }
      updateDoc.firstName = firstName;
      updateDoc.lastName = lastName;
      await updateDoc.save();
      return res.status(200).json({ "message": "change done" });
    }
  } catch (err) {
    return res.status(500).json({ "message": "error updating profile" });
    console.error(err);
  }

});

// Return contact object that is refereced from the req body
app.post("/api/contacts/search", async (req, res) => {
  req.body = sanitize(req.body);
  const {searchTerm, email} = req.body;

  //check if any of the fields are missing
  if (!searchTerm || !email) {
    // 400: bad request code
    return res.status(400).json({ "message": `Missing required parameter in request` });
  }

  //mongoose query to find matching elements
  //find all of the contacts that match the infomation provided
  try {
    //.findById requires object to be passed in
    const user = await User.findOne({email: email})
      .select('contacts')
      .populate({                                //since I am using references to IDs
        path: 'contacts',                         // .populate() muste be used to return full obj not just the referene
        match: {email: searchTerm},
        select: 'email firstName lastName color'
      });
    if (!user){
      return res.satus(404).json({"message": `error findind user with id ${email}`});
    }
    return res.status(200).json({
      "message" : "found successful",
      "contact" : user.contacts
    });

  } catch(err){
    return res.status(500).json({"message": "error with db query, contacts"});
  }

});

// Return all contact objects of the user 
app.get("/api/contacts/all-contacts", protect,  async (req, res) => {
  const email= sanitize(req.userId);

  //check if any of the fields are missing
  if (email) {

    try {
      //.findOne requires object to be passed in
      const user = await User.findOne({email: email})
        .select('contacts')
        .populate({                                //since I am using references to IDs
          path: 'contacts',                         // .populate() muste be used to return full obj not just the referene
          select: 'email firstName lastName color'
        });
      if (!user){
        return res.status(404).json({"message": `error findind user with id ${email}`});
      }

      res.status(200).json({
        "message" : "found successful",
        "contacts" : user.contacts
      });

    } catch (err) {
      return res.status(500).json({"message": "error with db query, contacts"});
    }
  }
});

// Return all contact objects of the user sorted by last message sent
app.get("/api/contacts/get-contacts-for-list:email", async (req, res) => {
  const {email} = req.params.email;
  
  if (email) {
    try {
      //get messages of user sorted
      const messages = await Message.find({receiver:email}).sort({createdAt: -1}).lean();

      // Extract unique Senders (since they are the 'contacts')
      // We use a Set to automatically handle duplicates
      const senderIds = [...new Set(messages.map(msg => msg.sender.toString()))];

      //Fetch the User details for those Senders
      const contacts = await User.find({  email:{ $in: senderIds } })
        .select("email firstName lastName color");

      return res.status(200).json({sortedcontacts: contacts});
    }
    catch (err) {
      console.error(err);
      return res.status(500).json({ "message": "Error fetching contact list" });
    }
  }

});

//delete the message of ID
app.delete("/api/contacts/delete-dm/:dmId", async (req, res) => {
  const {dmId, email} = req.params;

  try {
    const result = await Message.findOneAndDelete({
      _id: dmId,
      sender: email
    });

    if (!result) {
      return res.status(400).json({"message":"messsage not found"})
    }

    res.status(200).json({"message":"message succeffull delete"});
  
  } catch (err) {
    res.status(500).send(err.message);
  }
});

//return specific message
app.post("/api/messages/get-messages", async (req, res) => {
  req.body = sanitize(req.body);
  const {contactorId } = req.body;

  if (!contactId) {
    return res.status(400).json({ "message": "Missing user ID." });
  }
  try {
    // Logic to fetch messages from your database between req.user.id and id
    const messages = await Message.findById(contactorId);
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ "message": "Server error." });
  }
});

// start up the server
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
