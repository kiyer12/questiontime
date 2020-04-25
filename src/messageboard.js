'use strict';

import React from 'react'
import ReactDOM from 'react-dom'
import moment from 'moment'
import { GoogleLogin } from 'react-google-login';
import { GoogleLogout } from 'react-google-login';

const e = React.createElement;

class MessageBoard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      message: "",
      messages: [],
      googleUser: null,
      websocket: null,
      errorMessage: null,
      profileImage: ""
    };
  }
  
  getStream() {
    fetch("/api/getStream", { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken:this.state.googleUser.getAuthResponse().id_token })
    })
    .then((response) => {
      console.log(response);
      if (response.status === 200) {
        return response.json();
      }
      this.setState({errorMessage: "You are not authorized."});
      return [];
    })
    .then((data) => {
      // console.log(data);
      this.setState({messages: data});
    })
  }
  
  postMessage() {
    fetch("/api/postMessage", { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        authToken:this.state.googleUser.getAuthResponse().id_token,
        message: this.state.message
      })
    })
    .then((response) => {
      console.log(response);
      return response.json();
    })
    .then((data) => {
      console.log(data);
      this.setState({ message: "" });
    })
  }
  
  updateEventCode(evt) {
    this.setState({ message: evt.target.value });
  }

  websocketInit(googleUser) {
    var websocket = new WebSocket("wss://questiontime.glitch.me/echo", [],
      { 'headers': { 'x-Auth-Token': this.state.googleUser.getAuthResponse().id_token } });
    websocket.onopen = (event) => {
      websocket.send(this.state.googleUser.getAuthResponse().id_token);    
    };
    websocket.onclose = (evt) => {
      this.setState({websocket: null});
      // this.websocketInit(googleUser);
    }
    websocket.onmessage = (msg) => {
      var tmp = this.state.messages;
      tmp.push(JSON.parse(msg.data));
      this.setState({messages: tmp});
    };
    
    this.setState({websocket: websocket});
  }
  
  googleUserLoggedIn(googleUser) {
    console.log("login success");
    this.setState({googleUser:googleUser, profileImage:googleUser.profileObj.imageUrl}); 
    this.getStream();
    this.websocketInit(googleUser);
  }
  
  render() {
    const googleLogin = (
      <GoogleLogin
            clientId="555702065730-kv4r4cuhea60mlv8j1ngn4p9n8irec8o.apps.googleusercontent.com"
            buttonText="Login"
            onSuccess={ (googleUser) => { this.googleUserLoggedIn(googleUser); } }
            onFailure={ (googleFailure) => { console.log(googleFailure); } }
            cookiePolicy={'single_host_origin'}
            isSignedIn={ true }
      />
    );
    const googleLogout = (
      <GoogleLogout
        clientId="555702065730-kv4r4cuhea60mlv8j1ngn4p9n8irec8o.apps.googleusercontent.com"
        buttonText="Logout"
        onLogoutSuccess={(logout) => { console.log("logged out" + logout); this.setState({googleUser:null, messages:null});}}
      >
      </GoogleLogout>
    );
    const loggedIn = (
      <div>
        <MessageList messages={this.state.messages} />
        <div className="postArea">
          <img className="userPostImage" src={this.state.profileImage} /> 
           <textarea
            className="messageField"
            type="text"
            name="code"
            value={this.state.message}
            placeholder="Write a question..."
            onChange={evt => this.updateEventCode(evt)}
            />
            <button className="postButton" onClick={() => { this.postMessage();}}> </button>
        </div>
      </div>
    );
    
    const notConnected = (
      <div className="notConnectedBanner">Lost connection to QuestionTime. <a href="/">Reload to reconnect.</a></div>
    );
    
    return (
      <div>
        <div className="title">
          <div className="titleText">Question Time - Fast Q&A</div>
          {this.state.websocket === null  && this.state.googleUser !== null ? notConnected : "" }
          <span className="logoutButton">{this.state.googleUser !== null ? googleLogout : ""}</span> 
          </div> 
        { this.state.googleUser === null ? googleLogin : loggedIn }
        { this.state.errorMessage === null ? "" : (<span>You are not authorized.</span>) }
      </div>
    );
  }
}

class MessageList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
    };
    this.listRef = React.createRef();
  }

  componentDidUpdate() {
    console.log("fixing scroll");
    this.listRef.current.scrollTop = this.listRef.current.scrollHeight;
  }
  
  render() {
    return (
      <div ref={this.listRef} className="messageList">
        {this.props.messages.map((value, index) => {
          return <Message key={value.id} message={value} />
      })}
      </div>
    );
  }
}

class Message extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
    };
  }

  render() {
    return (
      <div className="message" >
        <div>
          <img className="userImage" src={this.props.message.userPayload.picture} /> 
          <div className="nameDateContainer">
            <div className="name">{this.props.message.userPayload.name}</div>
            <div className="date">{moment(this.props.message.dateTime).fromNow()}</div>
          </div>
        </div>
        <div><span className="text">{this.props.message.message}</span></div>
        <div></div>
      </div>
    );
  }
}


const domContainer = document.querySelector('#MessageBoard');
ReactDOM.render(e(MessageBoard), domContainer);