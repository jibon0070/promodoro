#!/bin/bash
server=promodoro
folder="~/promodoro"
backupname="backup-$(date +%Y-%m-%d-%H:%M).zip"

ssh $server <<EOF
cd $folder
docker compose down
zip -r -0 $backupname storage
docker compose up -d
EOF

mkdir -p backups

scp "$server:$folder/$backupname" "backups/$backupname"

ssh $server <<EOF
rm $folder/$backupname
EOF

pushd backups
# Count files in the current directory
total_files=$(ls -1p | grep -v / | wc -l)
max_files=3

# While more than 5 files, delete the oldest
while [ "$total_files" -gt "$max_files" ]; do
  # Find the oldest file (excluding directories)
  oldest_file=$(ls -1tp | grep -v / | tail -n 1)

  echo "Deleting oldest file: $oldest_file"

  # Delete the oldest file
  rm -- "$oldest_file"

  # Recount files
  total_files=$(ls -1p | grep -v / | wc -l)
done
popd
