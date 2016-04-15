var redis = require("redis");
var async = require("async");
var client = redis.createClient();
client.on("error", function (err){ console.log("Error " + err); });

var hincrby = function(key,field,increment){ return client.hincrby.bind(client,key,field,increment); };
var publish = function(channel,message){     return client.publish.bind(client,channel,message); };
var blpop   = function(key){                 return client.blpop.bind(client,key,0); };
var hset    = function(key,field,value){     return client.hset.bind(client,key,field,value); };
var hget    = function(key,field){           return client.hget.bind(client,key,field); };
var hdel    = function(key,field){           return client.hdel.bind(client,key,field); };
var rpush   = function(key,value){           return client.rpush.bind(client,key,value); };

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
  publish("console",JSON.stringify({op:'heartbeat', who:myName, what:"consumer"}), function(err,res){
    setTimeout(heartbeat, 60000);
  });
}
heartbeat();

function waitTask(){
  async.parallel({
    console: publish("console",JSON.stringify({op:'wait', who:myName, type:taskType})),
    getTask: blpop("queue-"+taskType)
  }, function(err, res){
    var task = JSON.parse(res.getTask[1]);
    async.parallel({
      console: publish("console",JSON.stringify({op:'get', who:myName, type:taskType, id:task.id, from:task.from})),
      doJob: doJob.bind(null,task)
    },function(err,res){
      var todo = {
        sendResult: publish(task.from,JSON.stringify({who:myName, type:taskType, id:task.id, res:res.doJob, from:task.from})),
        console: publish("console",JSON.stringify({op:'done', who:myName, type:taskType, id:task.id, res:res.doJob, from:task.from}))
      };
      if(res.doJob) todo.setResult = hset("result",task.id,JSON.stringify(res));
      if(task.next) todo.decreaseJobLeft = hincrby("count",task.next,-1);
      async.parallel(todo,function(err,res){ 
        if(!task.next || res.decreaseJobLeft != 0) return setTimeout(waitTask, 0); 
        var nextId = task.next;
        async.parallel({
          console: publish("console",JSON.stringify({op:'getNext', who:myName, id:task.next})),
          getTask: hget("task",nextId)
        },function(err,res){
          var strTask = res.getTask;
          task = JSON.parse(strTask);
          async.parallel({
            delTask: hdel("task",nextId),
            delCount: hdel("count",nextId),
            pushTask: rpush("queue-"+task.type, strTask)
          },function(err,res){
            return setTimeout(waitTask, 0); 
          });
        });
      });
    });
  });
}
waitTask();