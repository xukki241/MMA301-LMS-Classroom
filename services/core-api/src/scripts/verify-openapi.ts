import { openApiSpec } from "../docs/openapi.js";

const expected: Record<string, string[]> = {
  "/health": ["get"],
  "/me": ["get"],
  "/auth/login": ["post"],
  "/docs/tokens/teacher": ["post"],
  "/docs/tokens/student": ["post"],
  "/classes": ["post"],
  "/classes/teaching": ["get"],
  "/classes/enrolled": ["get"],
  "/classes/join": ["post"],
  "/classes/{id}": ["get", "patch", "delete"],
  "/classes/{id}/members": ["get"],
  "/classes/{classId}/posts": ["get", "post"],
  "/classes/{classId}/posts/{postId}": ["patch", "delete"],
  "/classes/{classId}/posts/{postId}/comments": ["get", "post"],
  "/classes/{classId}/posts/{postId}/comments/{commentId}": ["patch", "delete"],
  "/classes/{classId}/posts/{postId}/reactions": ["get", "post"],
  "/classes/{classId}/materials": ["get", "post"],
  "/classes/{classId}/materials/{materialId}": ["delete"],
  "/classes/{classId}/exercises": ["get", "post"],
  "/classes/{classId}/exercises/{exerciseId}/submissions": ["get", "post"],
  "/classes/{classId}/exercises/{exerciseId}/submissions/mine": ["get", "put"],
  "/classes/{classId}/exercises/{exerciseId}/submissions/{submissionId}": ["get"],
  "/classes/{classId}/exercises/{exerciseId}/submissions/{submissionId}/grade": ["put"],
};

const paths = openApiSpec.paths as Record<string, Record<string, unknown>>;
for (const [path, methods] of Object.entries(expected)) {
  if (!paths[path]) throw new Error(`Missing OpenAPI path: ${path}`);
  for (const method of methods) {
    const operation = paths[path][method] as { responses?: Record<string, unknown> } | undefined;
    if (!operation) throw new Error(`Missing OpenAPI operation: ${method.toUpperCase()} ${path}`);
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      throw new Error(`Missing responses: ${method.toUpperCase()} ${path}`);
    }
  }
}

const documented = new Set(Object.keys(paths));
const undocumented = [...documented].filter((path) => !expected[path]);
if (undocumented.length > 0) {
  throw new Error(`OpenAPI contains paths not present in route manifest: ${undocumented.join(", ")}`);
}

console.log(`Core OpenAPI contract OK (${Object.keys(expected).length} paths)`);
