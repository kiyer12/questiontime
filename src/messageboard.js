"use strict";

import React from "react";
import ReactDOM from "react-dom";
import moment from "moment";
import { GoogleLogin } from "react-google-login";
import { GoogleLogout } from "react-google-login";

const g_googleLoginClientId =
  "555702065730-kv4r4cuhea60mlv8j1ngn4p9n8irec8o.apps.googleusercontent.com";

const e = React.createElement;
const loggedInContext = React.createContext("");

class MessageBoard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      googleUser: null,
      websocket: null,
      errorMessage: null
    };
  }

  getStream() {
    fetch("/api/getStream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authToken: this.state.googleUser.getAuthResponse().id_token
      })
    })
      .then(response => {
        if (response.status === 200) {
          return response.json();
        }
        this.setState({ errorMessage: "You are not authorized." });
        return [];
      })
      .then(data => {
        // console.log(data);
        this.setState({ messages: data });
      });
  }

  websocketInit(googleUser) {
    var websocket = new WebSocket("wss://questiontime.glitch.me/echo", [], {
      headers: {
        "x-Auth-Token": this.state.googleUser.getAuthResponse().id_token
      }
    });
    websocket.onopen = event => {
      websocket.send(this.state.googleUser.getAuthResponse().id_token);
    };
    websocket.onclose = evt => {
      this.setState({ websocket: null });
      // this.websocketInit(googleUser);
    };
    websocket.onmessage = socketMessage => {
      var newMessage = JSON.parse(socketMessage.data);

      var tmp = this.state.messages;
      var foundIndex = tmp.findIndex(x => x.id === newMessage.id);
      if (foundIndex == -1) {
        tmp.push(newMessage);
      } else {
        tmp[foundIndex] = newMessage;
      }
      this.setState({ messages: tmp });
    };

    this.setState({ websocket: websocket });
  }

  googleUserLoggedIn(googleUser) {
    // console.log("login success");
    this.setState({ googleUser: googleUser });
    this.getStream();
    this.websocketInit(googleUser);
  }

  render() {
    const googleLogin = (
      <GoogleLogin
        clientId={g_googleLoginClientId}
        buttonText="Login"
        onSuccess={googleUser => {
          this.googleUserLoggedIn(googleUser);
        }}
        onFailure={googleFailure => {
          console.log(googleFailure);
        }}
        cookiePolicy={"single_host_origin"}
        isSignedIn={true}
      />
    );
    const googleLogout = (
      <GoogleLogout
        clientId={g_googleLoginClientId}
        buttonText="Logout"
        onLogoutSuccess={logout => {
          console.log("logged out" + logout);
          this.setState({ googleUser: null, messages: null });
        }}
      ></GoogleLogout>
    );
    const loggedIn = (
      <React.Fragment>
        <MessageList
          messages={this.state.messages}
          token={this.state.googleUser}
        />
        <PostEditor user={this.state.googleUser} />
      </React.Fragment>
    );

    return (
      <React.Fragment>
        <div className="title">
          <div className="titleText">Question Time - Fast Q&A</div>
          {this.state.websocket === null && this.state.googleUser !== null ? (
            <div className="notConnectedBanner">
              Lost connection to QuestionTime.{" "}
              <a href="/">Reload to reconnect.</a>
            </div>
          ) : (
            ""
          )}
          <span className="logoutButton">
            {this.state.googleUser !== null ? googleLogout : ""}
          </span>
        </div>
        {this.state.googleUser === null ? googleLogin : loggedIn}
        {this.state.errorMessage === null ? (
          ""
        ) : (
          <span>You are not authorized.</span>
        )}
      </React.Fragment>
    );
  }
}

class PostEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: ""
    };
  }

  postMessage() {
    fetch("/api/postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authToken: this.props.user.getAuthResponse().id_token,
        message: this.state.message
      })
    })
      .then(response => {
        // console.log(response);
        return response.json();
      })
      .then(data => {
        // console.log(data);
        this.setState({ message: "" });
      });
  }

  postPoll() {
    fetch("/api/postPoll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authToken: this.props.user.getAuthResponse().id_token,
        message: this.state.message,
        choices: ["option 1", "option 2"]
      })
    })
      .then(response => {
        return response.json();
      })
      .then(data => {
        // console.log(data);
        this.setState({ message: "" });
      });
  }

  updateEventCode(evt) {
    this.setState({ message: evt.target.value });
  }

  handleKeyPress(event) {
    if (event.key === "Enter") {
      this.postMessage();
    }
  }

  render() {
    return (
      <div className="postArea">
        <img
          className="userPostImage"
          src={this.props.user.profileObj.imageUrl}
        />
        <textarea
          className="messageField"
          type="text"
          name="code"
          value={this.state.message}
          placeholder="Write a question..."
          onChange={evt => this.updateEventCode(evt)}
          onKeyPress={evt => this.handleKeyPress(evt)}
        />
        <button
          className="postButton"
          onClick={() => {
            this.postMessage();
          }}
        >
          {" "}
        </button>
        <div className="characterCounter">
          {" "}
          {this.state.message.length} / 280
        </div>
        <button
          className="pollButton"
          onClick={() => {
            this.postPoll();
          }}
        >
          {" "}
        </button>
      </div>
    );
  }
}

class MessageList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.listRef = React.createRef();
  }

  componentDidUpdate() {
    this.listRef.current.scrollTop = this.listRef.current.scrollHeight;
  }

  render() {
    return (
      <div ref={this.listRef} className="messageList">
        {this.props.messages.map((value, index) => {
          return (
            <Message key={value.id} message={value} token={this.props.token} />
          );
        })}
      </div>
    );
  }
}

class Message extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  vote(option) {
    const operation = "poll_" + option.toString();
    fetch("/api/postFave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authToken: this.props.token.getAuthResponse().id_token,
        messageId: this.props.message.id,
        operation: operation
      })
    })
      .then(response => {
        return response.json();
      })
      .then(data => {});
  }

  toggleLike(userDidFave) {
    const operation = userDidFave ? "basic_unfave" : "basic_fave";
    fetch("/api/postFave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authToken: this.props.token.getAuthResponse().id_token,
        messageId: this.props.message.id,
        operation: operation
      })
    })
      .then(response => {
        return response.json();
      })
      .then(data => {});
  }

  render() {
    var contentRender;
    switch (this.props.message.postType) {
      case "text":
        contentRender = <TextRender message={this.props.message} />;
        break;
      case "poll":
        contentRender = (
          <PollRender
            message={this.props.message}
            voteFunc={this.vote.bind(this)}
          />
        );
        break;
      default:
        contentRender = <TextRender message={this.props.message} />;
        break;
    }

    return (
      <div className="message">
        <div>
          <img className="userImage" src={this.props.message.author.picture} />
          <div className="nameDateContainer">
            <div className="name">{this.props.message.author.name}</div>
            <div className="date">
              {moment(this.props.message.dateTime).fromNow()}
            </div>
          </div>
        </div>
        <div>{contentRender} </div>
        <FaveArea
          faves={this.props.message.faves}
          likeFunc={this.toggleLike.bind(this)}
          user={this.props.token}
        />
      </div>
    );
  }
}

class FaveArea extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  basicFaves() {
    return this.props.faves.filter(x => x.faveData === "basic_fave");
  }

  userFaved() {
    return (
      this.basicFaves().findIndex(
        x => x.faveAuthor.email === this.props.user.profileObj.email
      ) > -1
    );
  }

  renderFaveText() {
    if (this.basicFaves().length === 0) {
      return "";
    }

    var otherFaves = this.basicFaves().filter(
      x => x.faveAuthor.email !== this.props.user.profileObj.email
    );
    if (this.userFaved()) {
      otherFaves.push({ name: "You" });
    }

    const text = otherFaves
      .map(x => x.name)
      .slice(0, 2)
      .join(", ");

    //Todo: add the "and <x> others" text
    return text + " liked this.";
  }

  render() {
    return (
      <div className="favesArea">
        <div className="faveButtons">
          <button
            className="faveButton"
            onClick={() => {
              this.props.likeFunc(this.userFaved());
            }}
          >
            { this.userFaved() ? "⭐️" : "☆" }
          </button>
          <div className="favesText">{this.renderFaveText()}</div>
        </div>
      </div>
    );
  }
}

class TextRender extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <span className="text">{this.props.message.message}</span>;
  }
}

class PollRender extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getVoteTotals(optionNum) {
    const votes = this.props.message.faves.filter(x =>
      x.faveData.startsWith("poll_"+optionNum)
    );
    return votes.length;
  }
  
  render() {
    return (
      <React.Fragment>
        <span className="text">{this.props.message.message}</span>
        <div>
          {this.props.message.choices.map((value, index) => {
            return (
              <PollOption
                key={index}
                optionNum={index}
                option={value}
                numVotes={ this.getVoteTotals(index) }
                voteFunc={this.props.voteFunc}
              />
            );
          })}
        </div>
      </React.Fragment>
    );
  }
}

class PollOption extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <div>
          <button
            onClick={() => {
              this.props.voteFunc(this.props.optionNum);
            }}
          >
            {this.props.option} -- {this.props.numVotes}
          </button>
        </div>
      </React.Fragment>
    );
  }
}

const domContainer = document.querySelector("#MessageBoard");
ReactDOM.render(e(MessageBoard), domContainer);