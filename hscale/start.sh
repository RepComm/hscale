#!/bin/bash

# the name of the image we're using
IMAGE_NAME=$(basename $(pwd))

# the partial name of the container we're instancing
# we prefix hscale- to the beginning later
HSCALE_CNAME=$1
if [[ -z $HSCALE_CNAME ]]; then
  HSCALE_CNAME=$IMAGE_NAME
fi

# the full container name
FULL_CNAME=hscale-$HSCALE_CNAME

# pocketbase port ENV variable
POCKET_PORT=$2
if [[ -z $POCKET_PORT ]]; then
  POCKET_PORT=8090
fi

# marmot port ENV variable
MARMOT_PORT=$3
if [[ -z $MARMOT_PORT ]]; then
  MARMOT_PORT=8091
fi

# hscale deno http port ENV variable
HSCALE_PORT=$4
if [[ -z $HSCALE_PORT ]]; then
  HSCALE_PORT=8092
fi

DETACH=$5
if [[ $DETACH = "-d" ]]; then
  echo "[INFO] Will run in detached mode - webconsole will be available at http://localhost:$HSCALE_PORT/ui"
else
  DETACH=""
fi

PORTS_USED=false

echo "[CHECK] ports '$POCKET_PORT' '$MARMOT_PORT' '$HSCALE_PORT' in use"
if nc -z localhost $POCKET_PORT; then
  echo "[ISSUE] Port $POCKET_PORT already in use"
  PORTS_USED=true
fi

if nc -z localhost $MARMOT_PORT; then
  echo "[ISSUE] Port $MARMOT_PORT already in use"
  PORTS_USED=true
fi

if nc -z localhost $HSCALE_PORT; then
  echo "[ISSUE] Port $HSCALE_PORT already in use"
  PORTS_USED=true
fi

if [ $PORTS_USED = true ]; then
  echo "[INFO] Cannot start with ports that are already in use, exiting"
  exit 2
fi

echo "[INFO] Specified ports were available"
echo "[CHECK] hscale-$HSCALE_CNAME used by another container"

if podman container exists $FULL_CNAME; then
  echo "[ISSUE] Container partial name '$HSCALE_CNAME' aka full name '$FULL_CNAME' already exists. exiting."
  exit 2
fi

# echo FULL_CNAME: $FULL_CNAME , HSCALE_PORT: $HSCALE_PORT , MARMOT_PORT: $MARMOT_PORT , POCKET_PORT: $POCKET_PORT

PERSIST_VOL=${HSCALE_CNAME}_persist
echo "[CHECK] volume '$PERSIST_VOL' exists"
if podman volume exists $PERSIST_VOL; then
  echo "[INFO] volume exists"
else
  echo "[ACTION] Creating volume '$PERSIST_VOL' as it didn't exist"

  if ! podman volume create $PERSIST_VOL; then
    echo "[ISSUE] Failed to create volume"
    exit 2
  fi
fi

echo "[INFO] Starting container"

podman run \
--name $FULL_CNAME \
-v $PERSIST_VOL:/persist \
$DETACH \
-e HSCALE_PORT=$HSCALE_PORT \
-e POCKET_PORT=$POCKET_PORT \
-e MARMOT_PORT=$MARMOT_PORT \
-p $POCKET_PORT:$POCKET_PORT \
-p $MARMOT_PORT:$MARMOT_PORT \
-p $HSCALE_PORT:$HSCALE_PORT \
 hscale/$IMAGE_NAME \
deno run --allow-net --allow-read --allow-write --allow-run --allow-env /hscale/main.ts


# --net podman1 \