const express = require("express");
const session = require('express-session');
const shortid = require('shortid');
const low = require('lowdb')
const fs = require('fs')
const FileSync = require('lowdb/adapters/FileSync')
const {OAuth2Client} = require('google-auth-library');
const sqlite3 = require('better-sqlite3');
const sqlDB = new sqlite3('.data/questions.db', { verbose: console.log });
sqlDB.function('json_parse', (a) => JSON.parse(a));

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
  response.sendFile(__dirname + "/views/index.html");
});

app.post("/api/getStream", (request, response) => {
  const authToken = request.body.authToken;
  console.log('getting stream');
  isGoogleAuthed(
    authToken,
    process.env.ALLOWED_DOMAIN,
    (payload) => {
      /*
      var value = db.get('messages')
        .takeRight(20)
        .sortBy('dateTime')
        .value();
      */
      var posts = sqlDB.prepare('SELECT postId as id, dateTime, author as author, messageText as message from posts ORDER BY date(dateTime)').all();            
      var faves = sqlDB.prepare('SELECT postId as id, dateTime, faveAuthor from faves ORDER BY postId ASC').all();
      faves.forEach( f => {
        f.faveAuthor = JSON.parse(f.faveAuthor);
      });
      
      
      posts.forEach( p => {
        p.author = JSON.parse(p.author);
        p.faves = [];
        faves.forEach( f => {
          if (f.id === p.id) {
            p.faves.push(f);
          }
        });
      });

      response.json(posts);
    },
    (error) => {
      // response.json(["not authed"]);
      response.sendStatus(401);
    });
});

app.post("/api/postLike", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(authToken, process.env.ALLOWED_DOMAIN, (payload) => {
    // var message = db.get('messages').find({id: request.body.messageId}).value();
    var lightPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    db.get('messages').find({id: request.body.messageId}).get('faves').push(lightPayload).write();
  
    const stmt = sqlDB.prepare('INSERT INTO faves (postId, dateTime, faveAuthor) VALUES (?, ?, ?)');
    const info = stmt.run(request.body.messageId, new Date().toString(), JSON.stringify(lightPayload));
    console.log('wrote to sqlite');
    console.log(info);

    
    broadcastToAllWebsocketClients(db.get('messages').find({id: request.body.messageId}).value());
    response.json(["liked"]);
  },
  (error) => {
    response.json("not authed");
  });
});

app.post("/api/postMessage", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(authToken, process.env.ALLOWED_DOMAIN, (payload) => {
    var message = {
      dateTime: new Date(),
      userPayload: payload,
      messageType: 'text',
      message: request.body.message,
      id: shortid.generate(),
      faves: []
    };

    var eventMessages = db
      .get('messages')
      .push(message)
      .write();

    const stmt = sqlDB.prepare('INSERT INTO posts (postId, dateTime, author, postType, messageText) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(message.id, message.dateTime.toString(), JSON.stringify(payload), 'text', request.body.message);
    console.log('wrote to sqlite');
    console.log(info);
    
    response.json(["posted"]);
    broadcastToAllWebsocketClients(message);    
  },
  (error) => {
    response.json("not authed");
  });
});

app.post("/api/postPoll", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(authToken, process.env.ALLOWED_DOMAIN,
      (payload) => {
      // const choices = request.body.choices;
      const prompt = request.body.prompt;
      const choices = [ 'option1', 'option2'];
      var choiceDict = { };
      choiceDict = choices.reduce((c, cur) => {  c[cur] = 0;  });
      console.log("here");
      var message = {
        dateTime: new Date(),
        userPayload: payload,
        id: shortid.generate(),
        messageType: 'poll',
        choices: choiceDict,
        prompt: prompt
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