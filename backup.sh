#!/bin/bash
server=promodoro
folder="~/promodoro"
backupname="backup-$(date +%Y-%m-%d-%H:%M).zip"

ssh $server <<EOF
cd $folder
docker compose down
zip -r $backupname storage
docker compose up -d
EOF

mkdir -p backups

scp "$server:$folder/$backupname" "backups/$backupname"

ssh $server <<EOF
rm $folder/$backupname
EOF
