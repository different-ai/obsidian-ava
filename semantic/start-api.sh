#/bin/bash
#set -x

## install api
echo "Loading env"
source env/bin/activate

echo "Installing Requirements"
pip3 install -r requirements.txt

echo "Starting API"
python3 -m uvicorn api:app --port 3333
