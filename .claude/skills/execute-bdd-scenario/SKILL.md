---
name: Execute BDD scenarios
description: Execute BDD test scenarios from .feature files using browser automation.
user-invocable: false
---

# Execute BDD scenarios

## Instructions

- Execute `docker compose exec -T mongodb mongosh --username admin --password password --authenticationDatabase admin legaldoc --eval "db.documents.deleteMany({})"` to delete all documents. `@purge-data` tag already includes deleting all documents first, no need to execute in that case.
- When generating Playwright script, execute `Makefile` in the parent folder because we `npm run test:e2e` under the `web` folder. e.g. `execSync('make reseed', { stdio: 'inherit', cwd: '..' });`
- Wait 300ms for animation to finish after opening a dropdown by mouse click, enter or space key press.
