IMAGE_NAME=$(basename $(pwd))

read -p "Node ID #: " NODEID
read -p "Marmot Port: " NODEID

podman run \
--name hscale-$IMAGE_NAME \
--net podman1 \
-v persist:/persist \
--detach \
-p 8090:8090 \
-p 4221:4221 \
 hscale/$IMAGE_NAME \
/bin/bash -c "/pb/pocketbase serve --http=0.0.0.0:8090 --dir=\"/persist/pocketbase\" && /pb/marmot/marmot -config config.toml -cluster-addr 0.0.0.0:4221 -cluster-peers 'nats://0.0.0.0:4222/'"

