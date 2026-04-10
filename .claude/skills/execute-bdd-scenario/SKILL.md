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
- To verify SigNoz trace spans, query ClickHouse directly: `docker exec signoz-clickhouse clickhouse-client --database=signoz_traces --query="SELECT name, resources_string['service.name'] AS svc, attributes_string['<key>'] AS attr, attributes_number['<key>'] AS num_attr FROM distributed_signoz_index_v3 WHERE timestamp >= toDateTime64(now() - interval 5 minute, 9) AND name = '<span_name>' LIMIT 1 FORMAT Vertical"`. Note: the OTEL batch processor flushes every 15s, so traces may not appear immediately after user actions.
- Wait 300ms for animation to finish after opening a dropdown by mouse click, enter or space key press.
