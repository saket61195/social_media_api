const functions = require("firebase-functions");
const express = require("express");
const app = express();
const FBAuth = require("./util/fbAuth");

const { getAllscreams, postOneScream } = require("./handlers/screams");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
} = require("./handlers/users");

//Screams routes
app.get("/screams", getAllscreams);
app.post("/scream", FBAuth, postOneScream);

//users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);

exports.api = functions.https.onRequest(app);
