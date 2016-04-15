var redis = require("redis");
var client = redis.createClient();
var sub = redis.createClient();
client.on("error", function (err){ console.log("Error " + err); });

var taskTypeFirst = process.argv[2]||"A";
var taskTypeSecond = process.argv[3]||"B";
var taskTypeFirstNb = process.argv[4]||3;
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

function createTask(id,type,nextId){
  var task = {id:id,from:myName,next:nextId,type:type};
  tasks[task.id] = {msg:task};
  tasks[task.id].cb = function(err,res){
    client.publish("console",JSON.stringify({op:'completed', id:task.id, who:myName, type:task.type, res:res}));
  };
  return task;
}

function pushTask(task){
  client.publish("console",JSON.stringify({op:'push', id:task.id, who:myName, type:task.type}));
	client.rpush("queue-"+task.type, JSON.stringify(task));
}

function prepareTaskSecond(){
	var task = createTask(myName+"-"+(id++), taskTypeSecond);
  client.publish("console",JSON.stringify({op:'push', id:task.id, who:myName, type:task.type}));
	client.hset("task",task.id,JSON.stringify(task));
	client.hset("count",task.id,0);
  return task;
}

function prepareTaskFirst(second){
	var task = createTask(myName+"-"+(id++), taskTypeFirst, second.id);
	client.hincrby("count",second.id,1);
  return task;
}

function pushTasks(){
  var second = prepareTaskSecond();
  var tasks = [];
  for(var i=0;i<taskTypeFirstNb;i++)
    tasks.push(prepareTaskFirst(second));
  tasks.forEach(pushTask);
}

function setRandomInterval(fct,low,high){
  fct();
  setTimeout(setRandomInterval.bind(null,fct,low,high), low + Math.floor(Math.random()*(high-low)));
}

function spewTask(nb){
  while(nb--) pushTasks();
}

if(process.argv[5] == "spew"){
  var nb = parseInt(process.argv[6] || "100");
  spewTask(nb);
}else{
  var timerLow = parseInt(process.argv[5] || "100");
  var timerHigh = parseInt(process.argv[6] || ""+(timerLow*2));
  setRandomInterval(pushTasks,timerLow,timerHigh);
}

