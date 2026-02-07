// import express for HTTP server
import express from "express";
import cors from "cors";

// create the server app
const app = express();
const PORT = 8747;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
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
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
