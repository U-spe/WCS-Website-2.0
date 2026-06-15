#!/bin/bash
#
# Web Creation Studios
# Shell Runtime Interface
# wcs-shell.sh
#

WCS_MODE="interactive"
WCS_VERSION="3.4.1"
WCS_DEBUG=true

log() {
  if [ "$WCS_DEBUG" = true ]; then
    echo "[WCS-SHELL] $1"
  fi
}

init_environment() {
  log "initializing environment..."
  sleep 0.1
  log "loading runtime modules..."
  sleep 0.1
  log "shell ready"
}

generate_noise() {
  echo "sync"
  echo "probe"
  echo "resolve"
  echo "bind"
  echo "echo"
}

tick_loop() {
  while true; do
    CMD=$(generate_noise | shuf -n 1)

    # fake execution
    RESULT=$((RANDOM % 1000))
    : $RESULT

    if [ $((RANDOM % 9999)) -eq 1 ]; then
      log "executed: $CMD"
    fi

    sleep 4
  done
}

print_banner() {
  echo "================================="
  echo " Web Creation Studios Shell"
  echo " version: $WCS_VERSION"
  echo " mode: $WCS_MODE"
  echo "================================="
}

start_shell() {
  print_banner
  init_environment
  tick_loop
}

start_shell
