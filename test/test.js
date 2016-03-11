var async = require('async');
var should = require('should');
var Greyhound = require(__dirname + '/../index.js').Greyhound;

var config = {
  logger: {},
  buses: [
    {
      name: 'BUS-1',
      host: '127.0.0.1',
      port: 6379,
      database: 0,
      workQueueName: 'greyhound_default',
      ignoreErrors: false,
      toDrive: true,
      timeout: 100,
      options: {
        password: null
      }
    },

    {
      name: 'BUS-2',
      host: '127.0.0.1',
      port: 6379,
      database: 1,
      workQueueName: 'greyhound_default',
      ignoreErrors: false,
      toDrive: true,
      timeout: 100,
      options: {
        password: null
      }
    },

    {
      name: 'BUS-3',
      host: '127.0.0.1',
      port: 6379,
      database: 2,
      workQueueName: 'greyhound_default',
      ignoreErrors: false,
      toDrive: true,
      timeout: 100,
      options: {
        password: null
      }
    }
  ]
};

describe('Greyhound', function(){

  it('can connect to more than one redis instance', function(done){
    var g = new Greyhound(config);
    var jobs = [];

    jobs.push(function(next){
      g.start(next);
    });

    jobs.push(function(next){
      g.buses.length.should.equal(3);
      g.workers.length.should.equal(3);
      next();
    });

    [0,1,2].forEach(function(i){
      jobs.push(function(next){
        g.buses[i].connection.redis.set('key', i, next);
      });
    });

    [0,1,2].forEach(function(i){
      jobs.push(function(next){
        g.buses[i].connection.redis.get('key', function(error, val){
          should.not.exist(error);
          String(val).should.equal(String(i));
          next();
        });
      });

      jobs.push(function(next){
        g.workers[i].connection.redis.get('key', function(error, val){
          should.not.exist(error);
          String(val).should.equal(String(i));
          next();
        });
      });
    });

    async.series(jobs, function(error){
      should.not.exist(error);
      g.stop(done);
    });
  });

  it('will send data around to peers, and not republish data', function(done){
    var g = new Greyhound(config);
    var jobs = [];

    jobs.push(function(next){
      g.start(next);
    });

    [0,1,2].forEach(function(i){
      jobs.push(function(next){
        g.buses[i].subscribe('otherApp', 'default', 'werq', { bus_event_type : /^.*/}, next);
      });
    });

    jobs.push(function(next){
      g.buses[0].publish('some-test-event', {a: 1, b: 2}, next);
    });

    jobs.push(function(next){ setTimeout(next, 1000); });

    [0,1,2].forEach(function(i){
      jobs.push(function(next){
        g.buses[i].connection.redis.lrange('resque:queue:bus_incomming', 0, 9999, function(error, entries){
          should.not.exist(error);
          entries.length.should.equal(0);
          next();
        });
      });

      jobs.push(function(next){
        g.buses[i].connection.redis.lrange('resque:queue:otherapp_default', 0, 9999, function(error, entries){
          should.not.exist(error);
          entries.length.should.equal(1);
          next();
        });
      });
    });

    async.series(jobs, function(error){
      should.not.exist(error);
      g.stop(done);
    });
  });

  it('has a working logger');

  describe('errors', function(){
    it('can put errors in the error queue of the source bus', function(done){
      var g = new Greyhound(config);
      var jobs = [];

      jobs.push(function(next){
        g.start(next);

        // HACK
        g.jobs = function(){
          return {
            'greyhound-transfer': {
              perform: function(payload, callback){
                return callback(new Error('BUSTED'));
              },
            }
          };
        };
      });

      [0,1,2].forEach(function(i){
        jobs.push(function(next){
          g.buses[i].subscribe('otherApp', 'default', 'werq', { bus_event_type : /^.*/}, next);
        });
      });

      jobs.push(function(next){
        g.buses[0].publish('some-test-event', {a: 1, b: 2}, next);
      });

      jobs.push(function(next){ setTimeout(next, 1000); });

      jobs.push(function(next){
        g.buses[0].connection.redis.lrange('resque:failed', 0, 9999, function(error, entries){
          should.not.exist(error);
          entries.length.should.equal(1);
          next();
        });
      });

      [1,2].forEach(function(i){
        jobs.push(function(next){
          g.buses[i].connection.redis.lrange('resque:failed', 0, 9999, function(error, entries){
            should.not.exist(error);
            entries.length.should.equal(0);
            next();
          });
        });
      });

      async.series(jobs, function(error){
        should.not.exist(error);
        g.buses[0].connection.redis.del('resque:failed', function(){
          g.stop(done);
        });
      });
    });

    it('can not put errors in the error queue of the source bus', function(done){
      var g = new Greyhound(config);
      var jobs = [];

      jobs.push(function(next){
        // HACK
        config.buses[0].ignoreErrors = true;

        g.start(next);

        // HACK
        g.jobs = function(){
          return {
            'greyhound-transfer': {
              perform: function(payload, callback){
                return callback();
              }
            }
          };
        };
      });

      [0,1,2].forEach(function(i){
        jobs.push(function(next){
          g.buses[i].subscribe('otherApp', 'default', 'werq', { bus_event_type : /^.*/}, next);
        });
      });

      jobs.push(function(next){
        g.buses[0].publish('some-test-event', {a: 1, b: 2}, next);
      });

      jobs.push(function(next){ setTimeout(next, 1000); });

      jobs.push(function(next){
        g.buses[0].connection.redis.lrange('resque:failed', 0, 9999, function(error, entries){
          should.not.exist(error);
          entries.length.should.equal(0);
          next();
        });
      });

      [1,2].forEach(function(i){
        jobs.push(function(next){
          g.buses[i].connection.redis.lrange('resque:failed', 0, 9999, function(error, entries){
            should.not.exist(error);
            entries.length.should.equal(0);
            next();
          });
        });
      });

      async.series(jobs, function(error){
        should.not.exist(error);
        g.buses[0].connection.redis.del('resque:failed', function(){
          config.buses[0].ignoreErrors = false;
          g.stop(done);
        });
      });
    });
  });

});
