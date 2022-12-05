#/bin/bash
#set -x

## install api
echo "Loading env"
source env/bin/activate

echo "Installing Requirements"
pip3 install -r requirements.txt

echo "Starting API"
cd ..
python3 -m uvicorn semantic.api:app --port 3333
