const functions = require("firebase-functions");

const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialape-1434c.firebaseio.com",
});

const express = require("express");
const app = express();
const firebaseConfig = {
  apiKey: "AIzaSyC-spnb60EnKI7D69t94E1BB6fxtVQgjfE",
  authDomain: "socialape-1434c.firebaseapp.com",
  databaseURL: "https://socialape-1434c.firebaseio.com",
  projectId: "socialape-1434c",
  storageBucket: "socialape-1434c.appspot.com",
  messagingSenderId: "152306571176",
  appId: "1:152306571176:web:f876ee60d2528aa687af9d",
  measurementId: "G-QH5EPD65HR",
};

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get("/screams", (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamsId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(screams);
    })
    .catch((err) => console.error(err));
});

const FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("no token found");
    return res.status(403).json({ error: "unauthozied" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch((err) => {
      console.error("error while varifying token", err);
      return res.status(403).json(err);
    });
};

//post one scream

app.post("/scream", FBAuth, (req, res) => {
  const newScreams = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  db.collection("screams")
    .add(newScreams)
    .then((doc) => {
      res.json({ message: `documents ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: `somthing went worng` });
      console.error(err);
    });
});

const isEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) return true;
  else return false;
};

const isEmpty = (String) => {
  if (String.trim() === "") return true;
  else return false;
};

//signup route

app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = " must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "must be a valid email address";
  }

  if (isEmpty(newUser.password)) errors.password = "must not be empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = " password must match";
  if (isEmpty(newUser.handle)) errors.handle = "must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  // TODO: validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: `this handle is already taken` });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((tokenId) => {
      token = tokenId;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "email already use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

// login

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  let errors = {};

  if (isEmpty(user.email)) errors.email = "must not be empty";
  if (isEmpty(user.password)) errors.password = "must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "wrong credentials, please try again" });
      } else return res.status(500).json({ error: err.code });
    });
});

exports.api = functions.https.onRequest(app);
