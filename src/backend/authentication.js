import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const protect = (req, res, next) => {
  // Get token from the Authorization header
  const authHeader = req.headers.authorization;
  //const token = authHeader && authHeader.split(' ')[1]; use this version
  // if request has authenticaton type before token

  if (!authHeader) {
    return res.status(400).json({ "message": "authorization denied" });
  }

  try {
    //Verify token using your secret key
    const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);

    //Attach the user ID to the request object so the next function can use it
    req.user = decoded; 
    
    //Call next() to five access back to calling function
    next();

  } catch (err) {
    return res.status(401).json({ "message": "authorization denied" });
  }
};

export {protect};
