"use strict";
var reqPost = function(){
  var serverurl = "/";
  return function(url,data,cb){
    cb = cb || function(){};
    $.ajax(
      { 
        type: "POST", 
        url: serverurl+url,
        data: JSON.stringify(data),
        contentType: "application/json; charset=UTF-8",
        processData: false
      }
     ).done(function(ret){ cb(null,ret); })
      .fail(function(err){ cb(err,null); });
	}
}();
function cbConsole(err,res){
  if(err) return console.log("error",err);
  return console.log(res);
}
function getLength(type){
  reqPost("length",{type:type},cbConsole);
}
var userStream = new EventSource('/listen');
var queue = {};
function getQueue(type){
  if(!queue[type]){
    var q = queue[type] = {};
    q.row = $("<tr>");
    q.row.append($("<td>").text(type));
    q.nb = 0;
    q.cellNb = $("<td>").text(""+0);
    q.row.append(q.cellNb);
    /*reqPost("length",{type:type},function(err,res){ 
      q.nb += parseInt(res);
      q.cellNb.text(""+q.nb); 
    });*/
    q.increase = function(){
      q.cellNb.text(""+(++(q.nb)));
    }
    q.decrease = function(){
      q.cellNb.text(""+(--(q.nb)));
    }
    $("#queue").append(q.row);
  }
  return queue[type];
}

var producer = {};
function getProducer(pid){
  if(!producer[pid]){
    var p = producer[pid] = {};
    p.row = $("<tr>");
    p.row.append($("<td>").text(pid));
    p.cellStatus = $("<td>").text("alive");
    p.row.append(p.cellStatus);
    p.nb = 0;
    p.cellNb = $("<td>").text(""+0);
    p.row.append(p.cellNb);
    var dead = function(){
      p.cellStatus.text("dead");
    };
    p.timerID = setTimeout(dead,120000);
    p.heartbeat = function(){
      p.cellStatus.text("alive");
      clearTimeout(p.timerID);
      p.timerID = setTimeout(dead,120000);
    };
    p.increase = function(){
      p.cellNb.text(""+(++(p.nb)));
    };
    p.decrease = function(){
      p.cellNb.text(""+(--(p.nb)));
    };
    $("#producer").append(p.row);
  }
  return producer[pid];
}

var consumer = {};
function getConsumer(pid){
  if(!consumer[pid]){
    var c = consumer[pid] = {};
    c.row = $("<tr>");
    c.row.append($("<td>").text(pid));
    c.cellStatus = $("<td>").text("N/A");
    c.lastStatus = "N/A";
    c.row.append(c.cellStatus);
    var dead = function(){
      c.cellStatus.text("dead");
    };
    c.timerID = setTimeout(dead,120000);
    c.heartbeat = function(){
      c.cellStatus.text(c.lastStatus);
      clearTimeout(c.timerID);
      c.timerID = setTimeout(dead,120000);
    };
    c.text = function(txt){ c.cellStatus.text(c.lastStatus = txt); }
    $("#consumer").append(c.row);
  }
  return consumer[pid];
}

userStream.onmessage = function(event){
  var data = JSON.parse(event.data);
  var op = data.op;
  var who = data.who.split("-");
  var what = data.what;
  var pid = who[1];
  var type = data.type;
  var id = data.id;
  switch(op){
    case "wait":
      getConsumer(pid).text("wait");
      break;
    case "get":
      getConsumer(pid).text("work");
      getQueue(type).decrease();
      break;
    case "done":
      getConsumer(pid).text("done");
      break;
    case "push":
      getProducer(pid).increase();
      getQueue(type).increase();
      break;
    case "completed":
      getProducer(pid).decrease();
      break;      
    case "heartbeat":
      if(what == "consumer") getConsumer(pid).heartbeat();
      if(what == "producer") getProducer(pid).heartbeat();
      break;
    default:
      console.log(data);
  }
};