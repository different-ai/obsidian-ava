GCLOUD_PROJECT:=$(shell gcloud config list --format 'value(core.project)' 2>/dev/null)
REGION="us-central1"
SERVICE="obsidian-ai"
LATEST_IMAGE_URL=$(shell echo "gcr.io/${GCLOUD_PROJECT}/${SERVICE}:latest")
VERSION=$(shell sed -n 's/.*image:.*:\(.*\)/\1/p' api/service.prod.yaml)
IMAGE_URL=$(shell echo "gcr.io/${GCLOUD_PROJECT}/${SERVICE}:${VERSION}")

# echo the gcloud project
$(info GCLOUD_PROJECT is set to $(GCLOUD_PROJECT), to change it run `gcloud config set project <project>`)
$(info To get a list of your projects run `gcloud projects list`)

semantic/install: ## [DEVELOPMENT] Install the semantic API dependencies
	virtualenv $$TMPDIR/ava; \
	source $$TMPDIR/ava/bin/activate; \
	pip install -r semantic/requirements.txt; \
	pip install -r semantic/requirements-test.txt

api/install: ## [DEVELOPMENT] Install the API dependencies
	virtualenv $$TMPDIR/ava; \
	source $$TMPDIR/ava/bin/activate; \
	pip install -r api/requirements.txt; \
	pip install -r api/requirements-test.txt

api/run: ## [DEVELOPMENT] Run the API
	STABILITY_KEY=$(shell cat data.json | jq '.stableDiffusion.key') python3 -m uvicorn api.main:app

api/docker/build: ## [Local development] Build the docker image.
	@echo "Building docker image for urls ${LATEST_IMAGE_URL} and ${IMAGE_URL}"
	docker buildx build ./api --platform linux/amd64 -t ${LATEST_IMAGE_URL} -f ./api/Dockerfile
	docker buildx build ./api --platform linux/amd64 -t ${IMAGE_URL} -f ./api/Dockerfile

api/docker/run: ## [Local development] Run the docker image.
	docker build -t ${IMAGE_URL} -f ./api/Dockerfile ./api
	docker run -p 8000:8000 --rm --name obsidian-ai -e STABILITY_KEY=$(shell cat data.json | jq '.stableDiffusion.key') ${IMAGE_URL}

api/docker/push: api/docker/build ## [Local development] Push the docker image to GCR.
	docker push ${IMAGE_URL}
	docker push ${LATEST_IMAGE_URL}

api/docker/deploy: api/docker/push ## [Local development] Deploy the docker image to GCR.
	@echo "Will deploy Obsidian AI to ${REGION} on ${GCLOUD_PROJECT}"
	gcloud beta run services replace ./api/service.prod.yaml --region ${REGION}
	@echo "Make sure that you ran `make api/policy` to set the correct IAM policy for public access."

api/policy:
	gcloud run services set-iam-policy ${SERVICE} ./api/policy.prod.yaml --region ${REGION}

api/hosting:
	cd api; \
	firebase use ${GCLOUD_PROJECT}; \
	firebase deploy --only hosting

release: ## [DEVELOPMENT] Release a new version of the plugin
	npm run version
	@VERSION=$$(cat manifest.json | grep version | cut -d '"' -f 4 | head -n 1); \
	echo "Releasing version $$VERSION"; \
	git add .; \
	read -p "Commit content:" COMMIT; \
	echo "Committing '$$VERSION: $$COMMIT'"; \
	git commit -m "$$VERSION: $$COMMIT"; \
	git push origin main; \
	git tag $$VERSION; \
	git push origin $$VERSION
	echo "Done, check https://github.com/louis030195/obsidian-ava/actions"


.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
