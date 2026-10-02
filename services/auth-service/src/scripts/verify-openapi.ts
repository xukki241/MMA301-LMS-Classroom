import { authOpenApiSpec } from "../docs/openapi.js";

const expected = new Map<string, string[]>([
  ["/health", ["get"]],
  ["/auth/register", ["post"]],
  ["/auth/login", ["post"]],
]);

for (const [path, methods] of expected) {
  const operation = (authOpenApiSpec.paths as Record<string, Record<string, unknown>>)[path];
  if (!operation) throw new Error(`Missing OpenAPI path: ${path}`);
  for (const method of methods) {
    if (!operation[method]) throw new Error(`Missing OpenAPI operation: ${method.toUpperCase()} ${path}`);
  }
}

console.log(`Auth OpenAPI contract OK (${expected.size} paths)`);
