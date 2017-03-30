var express = require('express');
var path = require('path');
var app = express();

var port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

// Listen for requests
var server = app.listen(port, function() {
  var port = server.address().port;
  console.log('http port bound to ' + port);
});
