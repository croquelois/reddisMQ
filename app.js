var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var redis = require("redis");
var db = redis.createClient();
var sub = redis.createClient();
var EventEmitter = require('events');
var ee = new EventEmitter();

var errors = [];
db.on("error", function (err){ 
  errors.push(err); 
  if(err > 1000) errors.shift();
});

sub.on("message", function(channel, message){ ee.emit(channel, message); });
sub.subscribe("console");

var app = express();
app.set('port',process.env.PORT || 8080);
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function buildGenCb(res){
  return function(err,data){ 
    console.log("return length");
    var hasData = !(data === undefined || data === null);
    if(typeof data == "number") data = ""+data;
    if(!err && hasData) return res.status(200).send(data); // No error and data returned
    if(!err && !hasData) return res.status(200).send('ok'); // No error but no data returned
    if(err && hasData) return res.status(err).send(data); // Error with data returned => error code in err and explanation in data
    return res.status(500).send('Error'); // Unhandled error
  };
}

app.post('/length', function(req, res){
  console.log("receive length");
  db.llen("queue-"+req.body['type'],buildGenCb(res));
});
app.post('/errors', function(req, res){
  buildGenCb(res)(null,errors);
});
app.get('/listen', function(req,res){
  req.socket.setTimeout(24*60*60*1000);
  var messageCount = 0;
  var listener = function(message){
    messageCount++;
    res.write('id: ' + messageCount + '\n');
    res.write("data: " + message + '\n\n');
  };
  ee.addListener("console", listener);
  req.on("close", function() {
    ee.removeListener("console", listener);
  });
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');  
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
