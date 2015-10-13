var redis = require("redis");
var client = redis.createClient();
var sub = redis.createClient();
client.on("error", function (err){ console.log("Error " + err); });

var taskList = process.argv[2]||"A";
var myName = "producer-"+process.pid;
var id = 0;

var tasks = {};

sub.on("message", function(channel, message){
  message = JSON.parse(message);
  var task = tasks[message.id];
  delete tasks[message.id];
  if(task.cb) task.cb(null,message.res);
});
sub.subscribe(myName);

function heartbeat(){
  client.publish("console",JSON.stringify({op:'heartbeat', who:myName, what:"producer"}));
  setTimeout(heartbeat, 60000);
}
heartbeat();

function pushTask(){
	var task = {id:myName+"-"+(id++),from:myName};
	task.type = taskList[Math.floor(Math.random()*taskList.length)];
  tasks[task.id] = {msg:task};
  tasks[task.id].cb = function(err,res){
    client.publish("console",JSON.stringify({op:'completed', id:task.id, who:myName, type:task.type, res:res}));	
  };
  client.publish("console",JSON.stringify({op:'push', id:task.id, who:myName, type:task.type}));	
	client.rpush("queue-"+task.type, JSON.stringify(task));
}

function setRandomInterval(fct,low,high){
  fct();
  setTimeout(setRandomInterval.bind(null,fct,low,high), low + Math.floor(Math.random()*(high-low)));
}

function spewTask(nb){
  while(nb--) pushTask();
}

if(argv[3] == "spew"){
  var nb = parseInt(process.argv[4] || "100");
  spewTask(nb);
}else{
  var timerLow = parseInt(process.argv[3] || "100");
  var timerHigh = parseInt(process.argv[4] || ""+(timerLow*2));
  setRandomInterval(pushTask,timerLow,timerHigh);
}

