// import express for HTTP server
const express = require("express");
const http = require("http");
import cors from "cors";
//import .env : .config() sets .env varibles to process.env
require("dotenv").config();

// create a Server clas instance {} tells js to only use the Server
// blue print only from the socket.io lib
//const { Server } = require('socket.io');

// create the server app
const app = express();
const server = http.createServer(app); //give full access to http server instance
//const io = new Server(server);            //attach the sockets to the server instance(engine)

const PORT = process.env.PORT || 5173;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // only allow request from this domain
    credentials: true, //Allow cookies and authentication headers in cross-origin requests
  }),
);
//handle reques and responses in .json
app.use(express.json());

//----- Endpoints for backend
app.post("/api/auth/signup", (req, res) => {
  //Extract the user details from the req.body
  const { email, password } = req.body;
  console.log("Signup request body:", req.body);

  res.status().json({
    message: "signup successful",
    user: { email: email },
  });
});

// start up the server
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
