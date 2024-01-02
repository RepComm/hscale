#!/bin/bash

IMAGE_NAME=$(basename $(pwd))

# read -p "Host ports offset (default 0 for 10209,4221,): " NODEID
# read -p "Marmot Port: " NODEID

HSCALE_CNAME=$1
if [[ -d $HSCALE_CNAME ]]; then
  HSCALE_CNAME=$IMAGE_NAME
fi

HSCALE_PORT=$2
if [[ -d $HSCALE_PORT ]]; then
  HSCALE_PORT=10209
fi

MARMOT_PORT=$3
if [[ -d $MARMOT_PORT ]]; then
  MARMOT_PORT=4221
fi

POCKET_PORT=$4
if [[ -d $POCKET_PORT ]]; then
  POCKET_PORT=8090
fi

echo HSCALE_PORT: $HSCALE_PORT , MARMOT_PORT: $MARMOT_PORT , POCKET_PORT: $POCKET_PORT

podman run \
--name hscale-$HSCALE_CNAME \
-v persist:/persist \
-e HSCALE_PORT=$HSCALE_PORT \
-e POCKET_PORT=$POCKET_PORT \
-e MARMOT_PORT=$MARMOT_PORT \
-p $POCKET_PORT:$POCKET_PORT \
-p $MARMOT_PORT:$MARMOT_PORT \
-p $HSCALE_PORT:$HSCALE_PORT \
 hscale/$IMAGE_NAME \
deno run --allow-net --allow-read --allow-run --allow-env /hscale/main.ts


# --net podman1 \
# --detach \