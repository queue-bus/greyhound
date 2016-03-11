exports.buses = [

  {
    name: 'BUS-1',
    host: '127.0.0.1',
    port: 6379,
    database: 0,
    workQueueName: 'greyhound_default',
    ignoreErrors: true,
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
    options: {
      password: null
    }
  },

];
