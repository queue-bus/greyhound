var nodeQueueBus = require('node-queue-bus');
var buses = require(__dirname + '/../config/buses.js').buses;

var bus = new nodeQueueBus.bus({ connection: buses[0] });
bus.connect(function(){
  bus.publish('some-test-event', {a: 1, b: 2}, function(){
    process.exit();
  });
});
