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
      websocket: null
    };
  }

  postMessage(message) {
    
  }
  
  getStream() {
    fetch("/api/getStream", { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken:this.state.googleUser.getAuthResponse().id_token })
    })
    .then((response) => {
      // console.log(response);
      return response.json();
    })
    .then((data) => {
      // console.log(data);
      this.setState({messages: data});
    })
  }
  
  postMessage(evt) {
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
      // window.location.href = data.newCallUrl;
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
      this.websocketInit(googleUser);
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
    this.setState({googleUser:googleUser}); 
    this.getStream();
    this.websocketInit(googleUser);
    
  }
  
  render() {
    console.log("render mb");
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
    
    return (
      <div>
        <h1>Question Time - Fast Q&A</h1>
        { this.state.googleUser === null ? googleLogin : "" }
        <MessageList messages={this.state.messages} />
        <div className="postArea">
           <textarea
             className="messageField"
            type="text"
            name="code"
            value={this.state.message}
            onChange={evt => this.updateEventCode(evt)}
            />
          <button className="postButton" onClick={() => { this.postMessage(null);}}>Post</button>
          </div>
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
          <span className="name">{this.props.message.userPayload.name}</span>
          <span className="date">{moment(this.props.message.dateTime).fromNow()}</span>
        </div>
        <div><img className="userImage" src={this.props.message.userPayload.picture} /> <span className="text">{this.props.message.message}</span></div>
        <div></div>
      </div>
    );
  }
}


const domContainer = document.querySelector('#MessageBoard');
ReactDOM.render(e(MessageBoard), domContainer);