---
globs: web/**
---

## Testing

- `npm run lint` to lint all files.
  - `npm run lint -- "path/to/file.js*"` to lint a specific file.
- `npm test -- --silent` to run all unit tests.
  - `npm test -- --runTestsByPath "path/to/file.spec.js*" --testNamePattern="matching string" --silent` to run specific unit tests in a spec file.
- `npm run test:e2e` to run all Playwright tests.
  - `npm run test:e2e -- --grep "matching string"` to run specific Playwright tests.

## Convention

- Our own file names are in hyphenated lower case.
- Implement in JavaScript instead of TypeScript.
- Name test files with `*.spec.js*` next to the source code.
- Write JSDoc for exported functions in utils, and store actions/selectors.
