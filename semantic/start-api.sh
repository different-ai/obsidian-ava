#/bin/bash
#set -x

## Create virtual env
echo "Creating virtual env"
python3 -m venv $TMPDIR/ava

## Load virtual env
echo "Loading env"
source $TMPDIR/ava/bin/activate

## kill existing instance
echo "Killing existing instance"
pkill -9 -f api:app

## install api
echo "Installing Requirements"
pip3 install -r requirements.txt

echo "Starting API"
cd ..
python3 -m uvicorn semantic.api:app --port 3333
