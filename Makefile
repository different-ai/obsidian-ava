semantic/install:
	virtualenv env; \
	source env/bin/activate; \
	pip install -r semantic/requirements.txt; \
	pip install -r semantic/requirements-test.txt


release:
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

