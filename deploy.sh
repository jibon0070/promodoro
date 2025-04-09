server="promodoro"
folder="~/promodoro"
image="promodoro-web-prod"

pushd build || exit
docker compose build
docker save $image -o $image.tar
scp $image.tar $server:$folder
rm $image.tar
popd || exit

ssh $server <<EOF
cd $folder
docker compose down
docker rmi $image
docker load -i $image.tar
docker compose up -d
rm $image.tar
EOF
