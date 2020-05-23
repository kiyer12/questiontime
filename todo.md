# todo

# poll feature  
* make the poll options render prettily


# UI / UX todo
* Faves use stacked profile photos to show likes.

# infrastructure and data model
* refactor websocket to use message format vs. raw + convention
* make websocket the main transport in all cases. don't split.

# new features
* create an event with a code, etc. so you can have multiple going at a time. / event 
* archive or mark complete or delete a message "complete" on a message, and make a new archive section for those.

# complete
* allow "unfave" when you hit the fave button again -> after sqlite, getting annoyed with lowdb.
* make the enter key send the text in the text area.
* sqlite3 just for clearer data model / updates / etc. instead of lowdb. 
* liking updates the social proof text.
* make faves not duplicate. show self fave state on the star correctly so it works client side / you can't relike something.
* make fave text say "you liked this" if logged in user liked it.
* character counter for the text area;
* fix up the fave text in terms of putting it inline with the button.

* make a poll people can vote on.