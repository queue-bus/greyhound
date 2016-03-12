# Greyhound

[![Build Status](https://travis-ci.org/queue-bus/greyhound.svg?branch=master)](https://travis-ci.org/queue-bus/greyhound)

Moving events from one bus to another.
A bi-directional event transfer tool.

![https://raw.githubusercontent.com/queue-bus/greyhound/master/docs/greyhound.png](https://raw.githubusercontent.com/queue-bus/greyhound/master/docs/greyhound.png)

Greyhound is a tool that lets you copy all of the published events from one Queue-bus database to another.  This is useful when you have one application publishing events, but separate runtime requirements for distinct application tiers.  For example, perhaps your web application published every state change for every object in the system.  You want your analytics tool to log all of these, but your main application only subscribes to some of these changes.  You want to remove the events for the "analytics" system from the Publisher's bus as fast as possible in order to not back the system up.

This tool connects to `N` separate bus systems, and subscribes to `/.*/`, getting ever event.  Then, this small and fast application will quickly pop these events off of the queue it came from and fan them out to all other Buses.

## Notes:
- parallelism (multi-worker) doesn't actually make sense here... Redis is single threaded, and the job won't be CPU bound.  To that end, we are not using node-resque's `MultiWorker`... but maybe that's wrong
- the 'ignoreErrors' flag will not place jobs in the originating bus' error queue if Greyhound cannot reach the destination buses. Use this when you are worried about your source bus getting filled up with data that isn't that important.
- Greyhound can run as a bus `driver` with `DRIVER=true npm start`.  Don't do this in production.
