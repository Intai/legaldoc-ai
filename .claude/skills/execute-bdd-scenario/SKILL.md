---
name: Execute BDD scenarios
description: Execute BDD test scenarios from .feature files using browser automation.
user-invocable: false
---

# Execute BDD scenarios

## Instructions

- To delete all documents when a scenario step requires it: `docker compose exec -T mongodb mongosh --username admin --password password --authenticationDatabase admin legaldoc --eval "db.documents.deleteMany({})"`. Do NOT use this command when the @purge-data tag is present — that tag already runs `make reseed` which includes this cleanup.
- Execute `curl http://localhost:6333/collections/legal_documents/points/count -X POST -H 'Content-Type: application/json' -d '{}'` to check if the Qdrant vector database is empty.
- When generating Playwright script, execute `Makefile` in the parent folder because we `npm run test:e2e` under the `web` folder. e.g. `execSync('make reseed', { stdio: 'inherit', cwd: '..' });`
- Wait 300ms for animation to finish after opening a dropdown by mouse click, enter or space key press.
