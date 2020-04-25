const express = require("express");
const session = require('express-session');
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

app.use(express.urlencoded({extended: true})); // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json()); // Parse JSON bodies (as sent by API clients)


var expressWs = require('express-ws')(app);
var aWss = expressWs.getWss('/echo');

const adapter = new FileSync('.data/db.json')
const db = low(adapter);
db.defaults({ messages: [], count: 0 }).write();

function broadcastToAllWebsocketClients(message) {
    aWss.clients.forEach(function (client) {
      client.send(JSON.stringify(message));
    });
}

function isGoogleAuthed(token, allowedDomain, onSuccess, onFailure) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  async function verify(t, domain) {
    const ticket = await client.verifyIdToken({
        idToken: t,
        audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (allowedDomain !== "*" && payload['hd'] !== domain) {
      throw("domain not allowed");
    }
    return payload;
  }
  
  verify(token, allowedDomain)
    .then(onSuccess)
    .catch((error) => {
      console.log(error);
      onFailure(error);
    });    
}

// make all the files in 'public' available
app.use(express.static("public"));
app.use(express.static("dist"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/login.html");
});

app.post("/api/getStream", (request, response) => {
  const authToken = request.body.authToken;
  console.log('getting stream');
  isGoogleAuthed(
    authToken,
    process.env.ALLOWED_DOMAIN,
    (payload) => {
      var value = db.get('messages')
        .takeRight(20)
        .sortBy('dateTime')
        .value();
      response.json(value);
    },
    (error) => {
      // response.json(["not authed"]);
      response.sendStatus(401);
    });
});

app.post("/api/postMessage", (request, response) => {
  const authToken = request.body.authToken;
  console.log(authToken);
  isGoogleAuthed(authToken, process.env.ALLOWED_DOMAIN,
      (payload) => {

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
    
    // console.log("written");
    response.json(["posted"]);
    broadcastToAllWebsocketClients(message);
    
    },
    (error) => {
    response.json("not authed");
  });
});

app.ws('/echo', function(ws, req) {
  ws.on('message', function(msg) {
    isGoogleAuthed(
      msg, 
      process.env.ALLOWED_DOMAIN,
      (payload) => {
          console.log("websocket auth established");
      },
      (error) => {
        ws.close();
      }
    );
  });
});


// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Listening on port " + listener.address().port);
});