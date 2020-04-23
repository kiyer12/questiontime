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

  googleUserLoggedIn(googleUser) {
    console.log("login success"); 
    this.setState({googleUser:googleUser}); 
    this.getStream();
    
    var websocket = new WebSocket("wss://grizzly-shimmer-ink.glitch.me/echo", [],
      { 'headers': { 'x-Auth-Token': this.state.googleUser.getAuthResponse().id_token } });
    console.log(this.state.websocket);
    websocket.onopen = (event) => {
      websocket.send(this.state.googleUser.getAuthResponse().id_token);    
    };
    websocket.onclose = (evt) => {
      this.setState({websocket: null});
    }
    websocket.onmessage = (msg) => {
      // console.log("websocket: " + msg.data);
      var tmp = this.state.messages;
      tmp.push(JSON.parse(msg.data));
      this.setState({messages: tmp});
    };
    
    this.setState({websocket: websocket});
  }
  
  render() {
    console.log("render mb");
    const googleLogin = (
      <GoogleLogin
            clientId="555702065730-cenf5paf61i7iapdrpqoabet8leejerr.apps.googleusercontent.com"
            buttonText="Login"
            onSuccess={ (googleUser) => { this.googleUserLoggedIn(googleUser); } }
            onFailure={ (googleFailure) => { console.log(googleFailure); } }
            cookiePolicy={'single_host_origin'}
            isSignedIn={ true }
      />
    );
    const googleLogout = (
      <GoogleLogout
      clientId="555702065730-cenf5paf61i7iapdrpqoabet8leejerr.apps.googleusercontent.com"
      buttonText="Logout"
      onLogoutSuccess={(logout) => { console.log("logged out" + logout); this.setState({googleUser:null, messages:null});}}
    >
    </GoogleLogout>
    );
    
    return (
      <div>
        <h1>Question Time</h1>
        <h4>Quick Q&A</h4>
        { this.state.googleUser === null ? googleLogin : "" }
        <MessageList messages={this.state.messages} />
        <div>
           <input
            type="text"
            name="code"
            onChange={evt => this.updateEventCode(evt)}
            >
          </input>
          <button onClick={() => {
              this.postMessage(null);
            }}>Post</button>
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
  }

  render() {
    console.log("render ml");
    var listItems = "";                                          
    return (
      <div>
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
      <div className="message">
        <div><span className="name">{this.props.message.userPayload.name}</span><span className="date">{moment(this.props.message.dateTime).fromNow() + ", " +
              moment(this.props.message.dateTime).format('MMMM Do YYYY, h:mm:ss a')}</span></div>
        <div>{this.props.message.message}</div>
        <div></div>
      </div>
    );
  }
}


const domContainer = document.querySelector('#MessageBoard');
ReactDOM.render(e(MessageBoard), domContainer);