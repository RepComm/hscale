IMAGE_NAME=$(basename $(pwd))

# read -p "Node ID #: " NODEID
# read -p "Marmot Port: " NODEID

podman run \
--name hscale-$IMAGE_NAME \
--net podman1 \
-v persist:/persist \
-p 8090:8090 \
-p 4221:4221 \
-p 10209:10209 \
 hscale/$IMAGE_NAME \
deno run --allow-net --allow-read /hscale/main.ts


# --detach \