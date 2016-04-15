# redisMQ
proof of concept, redis Message Queue

## How to launch
### installation
```
npm install
```

### the interface
```
node app.js 
```
it allow you to follow on localhost:8080 the status of workers and tasks

### a consumer
```
node consumer.js
```
check the code to see options, don't hesitate to launch tons of them

### a producer
```
node producer.js
```
check the code to see options, don't hesitate to launch tons of them

### same with dependency
```
node consumerWithDep.js
node producerWithDep.js
```
don't mix consumers with and without dependency on the same queue

## Without dependency
![basic](https://github.com/croquelois/reddisMQ/blob/master/basic.png)

## With dependency
### job relationship as an the example
![dep](https://github.com/croquelois/reddisMQ/blob/master/dep.png)
### producer interaction with redis
![producerWithDep](https://github.com/croquelois/reddisMQ/blob/master/producerWithDep.png)
### consumer interaction with redis
![consumerWithDep](https://github.com/croquelois/reddisMQ/blob/master/consumerWithDep.png)


