const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

/**
 * Scalar's operation schema only accepts a response `$ref` after it has been
 * resolved to `$ref-value`. Bare component refs are dropped from Try it out.
 * Inline those refs so every operation stays testable and the body stays accurate.
 */
export function expandResponseRefs<T>(spec: T): T {
  const copy = JSON.parse(JSON.stringify(spec)) as {
    paths?: Record<string, Partial<Record<(typeof HTTP_METHODS)[number], { responses?: Record<string, unknown> }>>>;
    components?: { responses?: Record<string, unknown> };
  };
  const library = copy.components?.responses ?? {};
  for (const pathItem of Object.values(copy.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation?.responses) continue;
      for (const [status, response] of Object.entries(operation.responses)) {
        if (!response || typeof response !== "object" || !("$ref" in response)) continue;
        const ref = (response as { $ref?: unknown }).$ref;
        if (typeof ref !== "string" || !ref.startsWith("#/components/responses/")) continue;
        const name = ref.slice("#/components/responses/".length);
        const target = library[name];
        if (!target) throw new Error(`Unresolved OpenAPI response ref: ${ref}`);
        operation.responses[status] = JSON.parse(JSON.stringify(target)) as unknown;
      }
    }
  }
  return copy as T;
}
