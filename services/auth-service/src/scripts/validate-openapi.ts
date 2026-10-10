import SwaggerParser from "@apidevtools/swagger-parser";
import { authOpenApiSpec } from "../docs/openapi.js";

await SwaggerParser.validate(authOpenApiSpec as never);
console.log("Auth OpenAPI schema valid");
