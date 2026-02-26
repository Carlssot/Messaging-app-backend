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

// create a Server clas instance {} tells js to only use the Server
// blue print only from the socket.io lib
//const { Server } = require('socket.io');

// create the server app
const app = express();
const server = http.createServer(app); //give full access to http server instance
//const io = new Server(server);            //attach the sockets to the server instance(engine)

const PORT = process.env.PORT;

connectDB();

app.use(
  cors({
    //origin: process.env.FRONTEND_URL, // only allow request from this domain
    credentials: true, //Allow cookies and authentication headers in cross-origin requests
  }),
);
//handle reques and responses in .json
app.use(express.json());

//----- Endpoints for backend

//SINGUP
app.post("/api/auth/singup", async (req, res) => {
  // strip out any DB keys to prevent injection attacks
  req.body = sanitize(req.body);

  //Extract the user details from the req.body
  const { email, password, firstName, lastName } = req.body.user;
  //console.log("Signup request body:", req.body);

  //check if any of the fields are missing
  if (!email || !password || !firstName) {
    // 400: bad request code
    return res.status(400).json({ "message": `Missing required parameter in request` });
  }

  const exist = await User.findOne({email: email});
  if (exist) {
    return res.status(409).json({ "message": "Email already used" });
  }

  // hash the user password
  try {
    const salt = await bcrypt.genSalt(process.env.SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(500).json({
      "message": "hashing fail",
    });
  }

  // create new user model with data
  const newUser = new User({
    email: email,
    firstName: firstName,
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
      "firstName": firstName,
      "lastName": lastName,
      "profileSetup": newUser.profileSetup,
    },
  });
});

//LOG-IN
app.post("/api/auth/login", async (req, res) => {
  // strip out any DB keys to prevent injection attacks
  req.body = sanitize(req.body);
  const {email, Inputpassword} = req.body.user;

  //check if any of the fields are missing
  if (!email || !Inputpassword) {
    // 400: bad request code
    return res.status(400).json({ "message": `Missing required parameter in request` });
  }

  //find the user in DB 
  const user = await User.findOne({email: email}).select('password profileSetup');
  if (!user) {
    return res.satus(404).json({"message": "user not found"});
  }

  //compare the passwords, user.password is hashed
  bcrypt.compare(Inputpassword, user.password, (err, res) => {
    if(err) {
      console.error('Error comparing passwords:', err);
      return res.status(400).json({"message": "Login Error"});
    }
    if (res) {
      console.log("hash compare successful");
    }
  });

  //create JWT token
  const token = jwt.sign(
    {id: user._id},
    process.env.JWT_SECRET,
    {expiresIn: '15m'}    // options list 1 day expiration
  );

  res.status(200).json({
    "message" : "login successful",
    "token": token,
    "user" : {
      //"id": user._id,
      "email": email,
      //"firstName": user.firstName,
      //"lastName": user.lastName,
      "profileSetup": user.profileSetup,
      "color": user.color
    },
  });
});

// endpoint is protected with protect() verefies, JWT token
// get the user info from request body
app.get("/api/auth/userinfo", protect, async (req, res) => {
  req.body = sanitize(req.body);
  const {email} = req.body.user;

  //check if any of the fields are missing
  if (!email) {
    // 400: bad request code
    return res.status(400).json({ "message": `Missing required parameter in request` });
  }

  //find the information for the user
  const user = await User.findOne({email: email}).select('color email firstName lastName profileSetup');
  if (!user) {
    return res.satus(404).json({"message": "user not found"});
  }

  //user found, return object
  res.status(200).json({
    "message" : "found successful",
    "user" : user
  });
});

app.post("/api/auth/update-profile", protect, async (req, res) => {
});

app.post("/api/contacts/search", protect, async (req, res) => {
});

app.get("/api/contacts/all-contacts", protect, async (req, res) => {
});

app.get("/api/contacts/get-contacts-for-list", protect, async (req, res) => {
});

app.delete("/api/contacts/delete-dm/:dmId", protect, async (req, res) => {
});

app.post("/api/messages/get-messages", protect, async (req, res) => {
});

// start up the server
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
