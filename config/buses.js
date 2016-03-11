exports.buses = [

  {
    name: 'BUS-1',
    host: '127.0.0.1',
    port: 6379,
    database: 0,
    workQueueName: 'greyhound_default',
    ignoreErrors: true,
    timeout: 5000,
    toDrive: (process.env.DRIVER === 'true'),
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
    timeout: 5000,
    toDrive: (process.env.DRIVER === 'true'),
    options: {
      password: null
    }
  },

];
