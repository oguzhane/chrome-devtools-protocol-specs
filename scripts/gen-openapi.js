import { pascalCase } from "change-case";
import { writeJsonFile, readJsonFile, dirname } from "./utils.js";
import path from "path";


let protocol;
let schemaStore = {}

{
    let browserFlatten = readJsonFile(path.join(dirname(), "../prot/browser.domains.flatten.json"));
    let jsFlatten = readJsonFile(path.join(dirname(), "../prot/js.domains.flatten.json"));
    protocol = Object.assign({}, jsFlatten, browserFlatten);
}

function createSchemaId(domain, modelGroup, modelName, modelSubPath) {
    if (modelGroup === "events") {
        // https://example.com/Network/events/requestWillBeSent/params
        return `./${domain}.events.json#/components/schemas/Event${pascalCase(modelName)}Params`;
    }
    else if (modelGroup === "types") {
        // https://example.com/Network/types/RequestId
        return `./${domain}.types.json#/components/schemas/Type${pascalCase(modelName)}`;
    }
    else if (modelGroup === "commands") {
        // Network.commands.loadNetworkResource/params
        // Network.commands.loadNetworkResource/returns
        let postFix = modelSubPath ? `/${modelSubPath}` : '';
        return `./${domain}.commands.json#/components/schemas/Command${pascalCase(modelName)}${postFix}`;
    }
}

function parseSchemaId(id) {
    let url = new URL(id, "https://example.com");
    // [_, domain, modelGroup, modelName, modelSubPath]
    let subs = url.pathname.split("/");
    subs.shift();
    
    return subs;
}

function createProtocolId(domain, modelGroup, modelName) {
    return `${domain}.${modelGroup}.${modelName}`;
}

function copyProp(propName, jsonTo, jsonFrom){
    if (propName in jsonFrom) {
        jsonTo[propName] = jsonFrom[propName]
    }
}

function parseRefTypeValue(refValue, parentDomain) {
    let domain = parentDomain;
    let modelName = refValue;

    let subs = refValue.split(".");

    if (subs.length > 1) {
        domain = subs[0];
        modelName = subs[1];
    }
    
    return [domain, "types", modelName];
}

function makeSchema(domain, modelGroup, modelName, modelSubPath) {
    let schemaId = createSchemaId(domain, modelGroup, modelName, modelSubPath);
    
    if (schemaId in schemaStore) return;
    
    let protocolId = createProtocolId(domain, modelGroup, modelName);
    
    let val = protocol[protocolId];

    let schema = {
        // "$id": schemaId,
    }

    schemaStore[schemaId] = schema;

    copyProp("description", schema, val);
    // copyProp("optional", schema, val);
    copyProp("type", schema, val);
    // copyProp("items", schema, val);

    let recVisitProps = (props, modelSubPath) => {
        schema.properties = {};

        for (const valProp of props) {
            let {name, $ref, items} = valProp;
            let prop = {};
            
            schema.properties[name] = prop;
    
            copyProp("description", prop, valProp);
            // copyProp("optional", prop, valProp);
            copyProp("type", prop, valProp);
            
            
            if (!valProp["optional"]) {
                if (!schema.required) {
                    schema.required = [];
                }
                schema.required.push(name);
            }

            if (!$ref && items && items.$ref) {
                prop["items"] = {};
                $ref = items.$ref;
                prop = prop["items"]; 
            }
            else if (items) {
                prop["items"] = items;
            }

            if ($ref) {
                let [refDomain, refModelGroup, refModelName] = parseRefTypeValue($ref, domain);
                let refSchemaId = createSchemaId(refDomain, refModelGroup, refModelName, modelSubPath);
    
                prop["$ref"] = refSchemaId;
    
                makeSchema(refDomain, refModelGroup, refModelName);
            }
        }
    }

    if (modelGroup === "events" && val.parameters) 
    {
        if (!schema.type) {
            schema.type = "object";
        }
        recVisitProps(val.parameters);
    }
    else if (modelGroup === "types" && val.properties) 
    { 
        recVisitProps(val.properties);
    }
    else if (modelGroup === "commands") {
        if (val.parameters) {
            recVisitProps(val.parameters, "params");
        }
        if (val.returns) {
            recVisitProps(val.returns, "returns");
        }
    }
}

function emptyOpenApiSchema(){
    return {
        "openapi": "3.0.2",
        "info": {
            "title": "Chrome DevTools Protocol",
            "description": "This is auto-generated OpenAPI 3.0 specification for Chrome Dev Tools Protocol.",
            "version": "1.0.0"
        },
        "paths": {
        },
        "components": {
            "schemas": {
            }
        }
    }
}

function saveSchemaStore() {
    const files = {
        'Network.types.json': emptyOpenApiSchema(),
        'Network.events.json': emptyOpenApiSchema(),

        'Page.types.json': emptyOpenApiSchema(),
        'Page.events.json': emptyOpenApiSchema(),

        'Runtime.types.json': emptyOpenApiSchema(),
        'Runtime.events.json': emptyOpenApiSchema(),

        'Security.types.json': emptyOpenApiSchema(),
        'Security.events.json': emptyOpenApiSchema(),
    }

    for (const [id, schema] of Object.entries(schemaStore)) {
        const [domain, modelGroup, modelName, modelSubPath] = parseSchemaId(id);

        files[`${domain}`].components.schemas[`${path.basename(id)}`] = schema;
    }

    for (const [fileName, value] of Object.entries(files)) {
        writeJsonFile(path.join(dirname(), `../openapi-specs/${fileName}`), value);
    }
}

function generateSchemaStore() {
    for (const [key, value] of Object.entries(protocol)) {
        let subs = key.split(".");
        if (subs.length !== 3) continue;
    
        let [domain, modelGroup, modelName] = subs;
    
        if (modelGroup !== "events" || modelName !== "requestWillBeSent") continue;
    
        makeSchema(domain, modelGroup, modelName);
    }    
}

generateSchemaStore()
saveSchemaStore();