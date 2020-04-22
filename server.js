const express = require("express");
const session = require('express-session');
const pug = require('pug');
const shortid = require('shortid');
const low = require('lowdb')
const fs = require('fs')
const FileSync = require('lowdb/adapters/FileSync')
const {OAuth2Client} = require('google-auth-library');

const app = express();
app.use(session(
  {
    secret: 'ssshhhhh23746823746', 
    cookie: { maxAge: 6000000},
    saveUninitialized: true,
    resave: false
  })
);

app.use(express.urlencoded()); // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json()); // Parse JSON bodies (as sent by API clients)

const adapter = new FileSync('.data/db.json')
const db = low(adapter);
db.defaults({ messages: [], count: 0 }).write();

function isAuthed(sess) {
  if(sess && sess.email) {
    return true;
  }
  return false;
}

function isGoogleAuthed(token) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  async function verify(t) {
    const ticket = await client.verifyIdToken({
        idToken: t,
        audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    const name = payload['name'];
    // If request specified a G Suite domain:
    const domain = payload['hd'];
    return payload;
  }
  // const payload = verify(token).catch(console.error);
  return verify;
}

// Compile our templates
const makeCallPage = pug.compileFile(__dirname + "/views/make-call.pug");
const controlCallPage = pug.compileFile(__dirname + "/views/control-call.pug");


// make all the files in 'public' available
app.use(express.static("public"));
app.use(express.static("dist"));

app.get("/", (request, response) => {
  if (isAuthed(request.session)) {
    response.send(makeCallPage({ 
      "email": request.session.email
    }));
  }
  else {
    response.sendFile(__dirname + "/views/login.html");
  }
});

// Login and session setting
app.post("/login", (request, response) => {
  var pass = request.body.pass;
  if (process.env.PASSWORD !== pass) {
    console.log("not authorized");
    response.sendStatus(401);
  }
  console.log("authorizing: " + request.body.email);
  var sess = request.session;
  sess.email = request.body.email;
  response.redirect("/");
});

// Log when Twilio calls us back after a call ends or other status change
app.post("/twilioCallback", (request, response) => {
  console.log("status callback for twilio: " + request.body);
  response.json([]);
});

// Log when Twilio calls us back after a call ends or other status change
app.post("/slackCallback", (request, response) => {
  console.log("status callback for slack: " + request.body);
  response.json([]);
});

// Log when Twilio calls us back after a call ends or other status change
app.post("/slackOauth", (request, response) => {
  console.log("status callback for slack: " + request.body);
  response.json([]);
});

app.post("/api/getStream", (request, response) => {
  const authToken = request.body.authToken;
  const verify = isGoogleAuthed(authToken);
  verify(authToken)
    .then( (payload) => {
        
      var value = db.get('messages')
      .takeRight(20)
      .sortBy('dateTime')
      .value();
      
    console.log(value);
    response.json(value);
    })
    .catch((error) => {
      response.json(["not authed"]);
    });
});

app.post("/api/postMessage", (request, response) => {
  const authToken = request.body.authToken;
  console.log(authToken);
  const verify = isGoogleAuthed(authToken);
  verify(authToken)
    .then( (payload) => {

      var message = {
        dateTime: new Date(),
        userPayload: payload,
        message: request.body.message,
        id: shortid.generate()
      };

    var eventMessages = db
    .get('messages')
    .push(message)
    .write();
    
    console.log("written");
    response.json(["hello this is done."]);
    
    })
    .catch((error) => {
      console.log(error);
      response.json(["not authed"]);
    });  
});

app.post("/api/admin/:action", (request, response) => {
  const authToken = request.body.authToken;
  const verify = isGoogleAuthed(authToken);
  verify(authToken)
    .then( (payload) => {
      if (payload['hd'] !== process.env.ALLOWED_DOMAIN) {
        
        response.sendStatus(401);
        return;
      }
      if (request.params.action === 'clearAll') {
        db.get('messages').remove().write();
        response.json(["cleared"]);        
      }
      else {
        response.json(["unknown action"]);
      }
    })
    .catch((error) => {
      console.log(error);
      response.json(["not authed"]);
    });  
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Listening on port " + listener.address().port);
});
