var redis = require("redis");
var client = redis.createClient();
client.on("error", function (err){ console.log("Error " + err); });

var myName = "consumer-"+process.pid;
var taskType = process.argv[2]||"A";
var id = 0;
var timerLow = parseInt(process.argv[3] || "100");
var timerHigh = parseInt(process.argv[4] || ""+(timerLow*2));

function doJob(task,cb){
  var res = Math.random();
	setTimeout(cb.bind(null,null,res), timerLow + Math.floor(Math.random()*(timerHigh-timerLow)));
}

function heartbeat(){
  client.publish("console",JSON.stringify({op:'heartbeat', who:myName, what:"consumer"}));
  setTimeout(heartbeat, 60000);
}
heartbeat();

function waitTask(){
  client.publish("console",JSON.stringify({op:'wait', who:myName, type:taskType}));	
	client.blpop("queue-"+taskType, 0, function(err, res) {
    var queueName = res[0];
    var task = JSON.parse(res[1]);
    client.publish("console",JSON.stringify({op:'get', who:myName, type:taskType, id:task.id, from:task.from}));
		doJob(task,function(err,res){
      client.publish(task.from,JSON.stringify({who:myName, type:taskType, id:task.id, res:res, from:task.from}));
      client.publish("console",JSON.stringify({op:'done', who:myName, type:taskType, id:task.id, res:res, from:task.from}));
      waitTask()
    });
	});
}
waitTask();