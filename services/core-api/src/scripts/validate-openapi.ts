import SwaggerParser from "@apidevtools/swagger-parser";
import { openApiSpec } from "../docs/openapi.js";

await SwaggerParser.validate(openApiSpec as never);
console.log("Core OpenAPI schema valid");
