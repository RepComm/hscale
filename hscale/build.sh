IMAGE_NAME=$(basename $(pwd))

buildah bud \
 -f ./Containerfile \
 -t hscale/$IMAGE_NAME \
 .
