# todo

# infrastructure and data model
* sqlite3 just for clearer data model / updates / etc. instead of lowdb. 

* refactor websocket to use message format vs. raw + convetion
* make websocket the main transport in all cases. don't split.

# new features
* make a poll people can vote on.
* create an event with a code, etc. so you can have multiple going at a time. / event 

# UI / UX todo
* allow "unfave" when you hit the fave button again -> after sqlite, getting annoyed with lowdb.
* Faves use stacked profile photos to show likes.

* mark "complete" on a message, and make a new archive section for those.

# complete
* liking updates the social proof text.
* make faves not duplicate. show self fave state on the star correctly so it works client side / you can't relike something.
* make fave text say "you liked this" if logged in user liked it.
* character counter for the text area;

* make the enter key send the text in the text area.