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
      googleUser: null
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
      return response.json();
    })
    .then((data) => {
      console.log(data);
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
    })
  }
  
  updateEventCode(evt) {
    this.setState({ message: evt.target.value });
  }

  render() {
    console.log("render mb");
    const googleLogin = (
      <GoogleLogin
            clientId="555702065730-cenf5paf61i7iapdrpqoabet8leejerr.apps.googleusercontent.com"
            buttonText="Login"
            onSuccess={ (googleUser) => { console.log("login success"); this.setState({googleUser:googleUser}); this.getStream(); } }
            onFailure={ (googleFailure) => { console.log(googleFailure); } }
            cookiePolicy={'single_host_origin'}
            isSignedIn={ true }
      />
    );
    return (
      <div>
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
          return <Message key={index} message={value} />
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