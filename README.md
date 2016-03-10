# Greyhound
Moving events from one bus to another.
A bi-directional event transfer tool.

## Notes:
- parallelism (multi-worker) doesn't actually make sense here... Redis is single threaded, and the job won't be CPU bound

## TODO
- Logging
