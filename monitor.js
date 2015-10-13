var redis = require("redis");
var client = redis.createClient();
client.on("error", function (err){ console.log("Error " + err); });

client.on("message", function(channel, message){
  console.log(message);
});
client.subscribe("console");