/* 
    This scripts converts the protocol specs to flatten formats. 
    Flatten format of the specs are more convenient for openapi and jsonschema generators. 
*/

import { writeJsonFile, readJsonFile, dirname } from "./utils.js";
import * as path from "path";

let protDir = path.join(dirname(), "../prot/");

let browserProtFile = path.join(protDir, "browser_protocol.json");
let jsProtFile = path.join(protDir, "js_protocol.json");

let browserProtFlattenFile = path.join(protDir, "browser.domains.flatten.json");
let jsProtFlattenFile = path.join(protDir, "js.domains.flatten.json");


let browserProtocol = readJsonFile(browserProtFile);
let jsProtocol = readJsonFile(jsProtFile);

function flatten(protocol) {
    let flatten = {};

    for (const domain of protocol.domains) {
        let domainName = domain.domain;

        for (const [key, value] of Object.entries(domain)) {
            if (key === "types" || key === "commands" || key === "events") {
                continue;
            }

            flatten[`${domainName}.${key}`] = value;
        }
        
        if (domain.types) {
            for (const type of domain.types) {
                flatten[`${domainName}.types.${type.id}`] = type;
            }
        }
        
        if (domain.commands) {
            for (const command of domain.commands) {
                flatten[`${domainName}.commands.${command.name}`] = command;
            }
        }
        
        if (domain.events) {
            for (const event of domain.events) {
                flatten[`${domainName}.events.${event.name}`] = event;
            }
        }
    }
    return flatten;
}

let browserFlatten = flatten(browserProtocol);
let jsFlatten = flatten(jsProtocol);

writeJsonFile(browserProtFlattenFile, browserFlatten);
writeJsonFile(jsProtFlattenFile, jsFlatten);