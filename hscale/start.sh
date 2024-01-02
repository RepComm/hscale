#!/bin/bash

IMAGE_NAME=$(basename $(pwd))

HSCALE_CNAME=$1
if [[ -z $HSCALE_CNAME ]]; then
  HSCALE_CNAME=$IMAGE_NAME
fi

POCKET_PORT=$2
if [[ -z $POCKET_PORT ]]; then
  POCKET_PORT=8090
fi

MARMOT_PORT=$3
if [[ -z $MARMOT_PORT ]]; then
  MARMOT_PORT=8091
fi

HSCALE_PORT=$4
if [[ -z $HSCALE_PORT ]]; then
  HSCALE_PORT=8092
fi

echo HSCALE_CNAME: $HSCALE_CNAME , HSCALE_PORT: $HSCALE_PORT , MARMOT_PORT: $MARMOT_PORT , POCKET_PORT: $POCKET_PORT

PERSIST_VOL=${HSCALE_CNAME}_persist
echo Now checking if persistence volume exists for "$PERSIST_VOL"
if podman volume exists $PERSIST_VOL; then
  echo Volume exists, moving on
else
  echo "Creating volume '$PERSIST_VOL' as it didn't exist"

  if ! podman volume create $PERSIST_VOL; then
    echo "Failed to create volume"
    exit 2
  fi
fi

podman run \
--name hscale-$HSCALE_CNAME \
-v $PERSIST_VOL:/persist \
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