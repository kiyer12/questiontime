const express = require("express");
const session = require("express-session");
const shortid = require("shortid");
const fs = require("fs");
const { OAuth2Client } = require("google-auth-library");
const sqlite3 = require("better-sqlite3");
const sqlDB = new sqlite3(".data/questions.db", { verbose: console.log });
sqlDB.function("json_parse", a => JSON.parse(a));

const app = express();
app.use(
  session({
    secret: "ssshhhhh23746823746",
    cookie: { maxAge: 6000000 },
    saveUninitialized: true,
    resave: false
  })
);

app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json()); // Parse JSON bodies (as sent by API clients)

var expressWs = require("express-ws")(app);
var aWss = expressWs.getWss("/echo");

function broadcastToAllWebsocketClients(message) {
  aWss.clients.forEach(function(client) {
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
    if (allowedDomain !== "*" && payload["hd"] !== domain) {
      throw "domain not allowed";
    }
    return payload;
  }

  verify(token, allowedDomain)
    .then(onSuccess)
    .catch(error => {
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

function dbGetMessage(id) {
  var post = sqlDB
    .prepare(
      "SELECT postId as id, dateTime, author, messageText as message from posts WHERE postId=?"
    )
    .get(id);
  var faves = sqlDB
    .prepare(
      "SELECT postId as id, dateTime, faveAuthor from faves WHERE postId=? "
    )
    .all(id);
  post.author = JSON.parse(post.author);
  faves = faves.map(x => JSON.parse(x.faveAuthor));

  post.faves = faves;
  return post;
}

app.post("/api/getStream", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(
    authToken,
    process.env.ALLOWED_DOMAIN,
    payload => {
      var posts = sqlDB
        .prepare(
          "SELECT postId as id, dateTime, author as author, messageText as message from posts ORDER BY date(dateTime)"
        )
        .all();
      var faves = sqlDB
        .prepare(
          "SELECT postId as id, dateTime, faveAuthor from faves ORDER BY postId ASC"
        )
        .all();
      faves.forEach(f => {
        f.faveAuthor = JSON.parse(f.faveAuthor);
      });

      posts.forEach(p => {
        p.author = JSON.parse(p.author);
        p.faves = [];
        faves.forEach(f => {
          if (f.id === p.id) {
            p.faves.push(f.faveAuthor);
          }
        });
      });

      response.json(posts);
    },
    error => {
      response.sendStatus(401);
    }
  );
});

app.post("/api/postLike", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(
    authToken,
    process.env.ALLOWED_DOMAIN,
    payload => {
      if (request.body.operation === "fave") {
        var lightPayload = {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        };

        const stmt = sqlDB
          .prepare(
            "INSERT INTO faves (postId, dateTime, faveAuthor, authorId) VALUES (?, ?, ?, ?)"
          )
          .run(
            request.body.messageId,
            new Date().toISOString(),
            JSON.stringify(lightPayload),
            payload.sub
          );

        var post = dbGetMessage(request.body.messageId);
        broadcastToAllWebsocketClients(post);
        response.json(["liked"]);
      } else {
        const stmt = sqlDB
          .prepare("DELETE FROM faves WHERE postId=? AND authorId=?")
          .run(request.body.messageId, payload.sub);
        console.log(stmt);
        var post = dbGetMessage(request.body.messageId);
        broadcastToAllWebsocketClients(post);
        response.json(["liked"]);
      }
    },
    error => {
      response.json("not authed");
    }
  );
});

app.post("/api/postMessage", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(
    authToken,
    process.env.ALLOWED_DOMAIN,
    payload => {
      var message = {
        dateTime: new Date(),
        author: payload,
        messageType: "text",
        message: request.body.message,
        id: shortid.generate(),
        faves: []
      };

      const stmt = sqlDB
        .prepare(
          "INSERT INTO posts (postId, dateTime, author, postType, messageText) VALUES (?, ?, ?, ?, ?)"
        )
        .run(
          message.id,
          message.dateTime.toISOString(),
          JSON.stringify(payload),
          "text",
          request.body.message
        );

      broadcastToAllWebsocketClients(message);
      response.json(["posted"]);
    },
    error => {
      response.json("not authed");
    }
  );
});

app.post("/api/postPoll", (request, response) => {
  const authToken = request.body.authToken;
  isGoogleAuthed(
    authToken,
    process.env.ALLOWED_DOMAIN,
    payload => {
      // const choices = request.body.choices;
      const prompt = request.body.prompt;
      const choices = ["option1", "option2"];
      var choiceDict = {};
      choiceDict = choices.reduce((c, cur) => {
        c[cur] = 0;
      });
      console.log("here");
      var message = {
        dateTime: new Date(),
        userPayload: payload,
        id: shortid.generate(),
        messageType: "poll",
        choices: choiceDict,
        prompt: prompt
      };

      // console.log("written");
      response.json(["posted"]);
      broadcastToAllWebsocketClients(message);
    },
    error => {
      response.json("not authed");
    }
  );
});

app.ws("/echo", function(ws, req) {
  ws.on("message", function(msg) {
    isGoogleAuthed(
      msg,
      process.env.ALLOWED_DOMAIN,
      payload => {
        console.log("websocket auth established");
      },
      error => {
        ws.close();
      }
    );
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Listening on port " + listener.address().port);
});
