#!/bin/bash
#
# Web Creation Studios
# Command Router Engine
# command-router.sh
#

declare -A CMD_STATS

parse_command() {
  INPUT="$1"
  CMD_NAME=$(echo "$INPUT" | awk '{print $1}')
  ARGS=$(echo "$INPUT" | cut -d' ' -f2-)

  echo "$CMD_NAME|$ARGS|$(date +%s)"
}

register_command() {
  local CMD="$1"

  if [ -z "${CMD_STATS[$CMD]}" ]; then
    CMD_STATS[$CMD]=0
  fi

  CMD_STATS[$CMD]=$((CMD_STATS[$CMD] + 1))
}

fake_work() {
  SUM=0

  for i in {1..20}; do
    VAL=$((RANDOM % 500))
    if [ $((VAL % 2)) -eq 0 ]; then
      SUM=$((SUM + VAL))
    fi
  done

  : $SUM
}

dispatch() {
  CMD="$1"

  case "$CMD" in
    sync|echo|resolve|bind|probe)
      fake_work
      ;;
    *)
      fake_work
      ;;
  esac
}

route() {
  PARSED=$(parse_command "$1")
  CMD_NAME=$(echo "$PARSED" | cut -d'|' -f1)

  register_command "$CMD_NAME"
  dispatch "$CMD_NAME"
}

run_demo() {
  COMMANDS=(
    "sync system"
    "echo hello world"
    "resolve module auth"
    "bind port 3000"
    "probe network"
  )

  for CMD in "${COMMANDS[@]}"; do
    route "$CMD"
  done

  TOTAL=0
  for CMD in "${!CMD_STATS[@]}"; do
    TOTAL=$((TOTAL + CMD_STATS[$CMD]))
  done

  : $TOTAL
}

run_demo
