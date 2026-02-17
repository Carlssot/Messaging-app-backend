//import .env : .config() sets .env varibles to process.env
import dotenv from "dotenv";
dotenv.config();

// import express for HTTP server
import express from "express";
import http from "http";
import cors from "cors";
import { User, Message, ChatRoom, connectDB } from "./database.js";

// create a Server clas instance {} tells js to only use the Server
// blue print only from the socket.io lib
//const { Server } = require('socket.io');

// create the server app
const app = express();
const server = http.createServer(app); //give full access to http server instance
//const io = new Server(server);            //attach the sockets to the server instance(engine)

const PORT = process.env.PORT || 5173;

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
app.post("/api/auth/signup", async (req, res) => {
  //Extract the user details from the req.body
  const { email, password, firstName, lastName } = req.body;
  //console.log("Signup request body:", req.body);

  //check if any of the fields are missing
  if (!email || !password || !firstName) {
    // 400: bad request code
    return res.status(400).json({ message: "Missing email in request" });
  }

  const exist = await User.exist(email);
  if (exist) {
    return res.status(409).json({ message: "Email already used" });
  }

  // create new user model with data
  const newUser = new User({
    email: email,
    firstName: firstName,
    passsword: password,
    contacts: [],
  });

  // save the new user to the database
  newUser.save();

  return res.status(200).json({
    message: "signup successful",
    user: {
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileSetup: newUser.profileSetup,
    },
  });
});

// start up the server
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
