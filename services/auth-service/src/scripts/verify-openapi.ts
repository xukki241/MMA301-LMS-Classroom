import { operation } from "@scalar/schemas/openapi/3.1";
import { validate } from "@scalar/validation";
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

const authPaths = authOpenApiSpec.paths as Record<string, Record<string, { responses?: Record<string, unknown> }>>;
for (const [path, item] of Object.entries(authPaths)) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const candidate = item[method];
    if (!candidate) continue;
    if (!validate(operation, candidate)) {
      throw new Error(`Scalar cannot test ${method.toUpperCase()} ${path}`);
    }
    for (const [status, response] of Object.entries(candidate.responses ?? {})) {
      if (response && typeof response === "object" && "$ref" in response && !("description" in response)) {
        throw new Error(`Scalar cannot test ${method.toUpperCase()} ${path}: response ${status} is an unresolved $ref`);
      }
    }
  }
}

console.log(`Auth OpenAPI contract OK (${expected.size} paths)`);
