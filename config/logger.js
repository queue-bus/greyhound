exports.logger = {
  stdout: true,
  path: __dirname + '/../log',
  level: process.env.LOG_LEVEL || 'info',
};
