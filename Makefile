
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



push_release:
	@VERSION=$$(cat manifest.json | grep version | cut -d '"' -f 4 | head -n 1); \
	git push origin main; \
	git tag $$VERSION; \
	git push origin $$VERSION
	echo "Done, check https://github.com/louis030195/obsidian-ava/actions"


prepare_release:
	npm run version
	@VERSION=$$(cat manifest.json | grep version | cut -d '"' -f 4 | head -n 1); \
	echo "Releasing version $$VERSION"; \
	read -p "Commit content:" COMMIT; \
	echo "Committing '$$VERSION: $$COMMIT'"; \
	git commit -m "$$VERSION: $$COMMIT"; \
	


.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
