#!/bin/sh

# Entrypoint script for the Location Tracker Simulator
# This ensures arguments are passed to our simulator script, not to node

exec node src/simulator.js "$@"