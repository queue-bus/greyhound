#!/usr/bin/env node

var async = require('async');
var nodeQueueBus = require('node-queue-bus');
var winston = require('winston');
var mkdirp = require('mkdirp');

var Greyhound = function(){
  this.appKey = 'greyhound';
  this.buses = [];
  this.workers = [];
  this.config = {
    buses: require(__dirname + '/config/buses.js').buses,
    logger: require(__dirname + '/config/logger.js').logger,
  };

  var transports = [];

  if(this.config.logger.stdout){
    transports.push( new (winston.transports.Console)({
      colorize:  true,
      timestamp: true,
      level: this.config.logger.level,
    }) );
  }

  if(this.config.logger.path){
    mkdirp.sync(this.config.logger.path);
    transports.push( new (winston.transports.File)({
      filename: this.config.logger.path + '/greyhound.log',
      level: this.config.logger.level,
      json: false,
    }));
  }

  this.logger = new (winston.Logger)({ transports: transports });
};

Greyhound.prototype.jobs = function(){
  return {
    'greyhound-transfer': {
      perform: function(payload, callback){
        var self = this;
        var jobJobs = [];
        self.buses.forEach(function(bus){
          if(bus.name !== self.name && !payload.__originating_bus){
            jobJobs.push(function(done){
              payload.__originating_bus = self.name;
              bus.publish(payload.bus_event_type, payload, function(error){
                if(error && bus.connection.options.ignoreErrors !== true){
                  return done(error);
                }else{
                  return done();
                }
              });
            });
          }
        });

        async.parallel(jobJobs, callback);
      },
    }
  };
};

Greyhound.prototype.start = function(callback){
  var self = this;
  var bootJobs = [];

  self.config.buses.forEach(function(c){

    bootJobs.push(function(done){
      var bus = new nodeQueueBus.bus({
        connection: c
      }, self.jobs());

      bus.connect(function(){
        bus.name = c.name;
        self.buses.push(bus);
        done();
      });
    });

    bootJobs.push(function(done){
      var bus = self.buses[(self.buses.length - 1)];
      bus.subscribe(self.appKey, 'default', 'greyhound-transfer', { bus_event_type : /^.*/}, function(){
        self.logger.info('subscribed to greyhound-transfer on bus `' + bus.name + '`');
        done();
      });
    });

    bootJobs.push(function(done){
      var worker = new nodeQueueBus.rider({
        connection: c,
        queues: [c.workQueueName],
        name: c.name,
        toDrive: (process.env.DRIVER === 'true')
      }, self.jobs());

      worker.on('start',           function(){ self.logger.debug(worker.name + ': worker started'); });
      worker.on('end',             function(){ self.logger.debug(worker.name + ': worker ended'); });
      worker.on('cleaning_worker', function(worker){ self.logger.info(worker.name + ': cleaning old worker ' + worker); });
      worker.on('poll',            function(queue){ self.logger.debug(worker.name + ': worker polling ' + queue); });
      worker.on('job',             function(queue, job){ self.logger.debug(worker.name + ': working job ' + queue + ' ' + JSON.stringify(job)); });
      worker.on('reEnqueue',       function(queue, job, plugin){ self.logger.debug(worker.name + ': reEnqueue job (' + plugin + ') ' + queue + ' ' + JSON.stringify(job)); });
      worker.on('success',         function(queue, job, result){ self.logger.info(worker.name + ': job success ' + queue + ' ' + JSON.stringify(job) + ' >> ' + result); });
      worker.on('failure',         function(queue, job, failure){ self.logger.error(worker.name + ': job failure ' + queue + ' ' + JSON.stringify(job) + ' >> ' + failure); });
      worker.on('error',           function(queue, job, error){ self.logger.error(worker.name + ': error ' + queue + ' ' + JSON.stringify(job) + ' >> ' + error); });
      worker.on('pause',           function(){ self.logger.debug(worker.name + ': worker paused'); });

      worker.buses = self.buses; //TODO: is there a better way to get these
      self.workers.push(worker);

      worker.connect(function(){
        self.logger.info('worker running on bus `' + worker.name + '`');
        worker.workerCleanup();
        worker.start();
        done();
      });
    });
  });

  async.series(bootJobs, function(error){
    if(error){
      self.logger.error(error);
      if(typeof callback === 'function'){ return callback(error); }
    }else{
      self.logger.warn('connected!');
      if(typeof callback === 'function'){ return callback(); }
    }
  });
};

Greyhound.prototype.stop = function(callback){
  var self = this;
  var stopJobs = [];

  self.workers.forEach(function(worker){
    stopJobs.push(function(done){
      worker.end(done);
    });
  });

  async.series(stopJobs, function(error){
    if(error){ throw error; }
    self.logger.warn('stopped');
    if(typeof callback === 'function'){ return callback(); }
  });
};

//*** Running Standalone ***//

if(require.main === module){
  var G = new Greyhound();
  G.start();

  process.on('SIGINT',  function(){ G.stop(process.exit) });
  process.on('SIGTERM', function(){ G.stop(process.exit) });
  process.on('SIGHUP',  function(){ G.stop(process.exit) });
}else{
  exports.Greyhound = Greyhound;
}
