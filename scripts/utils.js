import fs from "fs";
import * as url from 'url';

export function writeJsonFile(filePath, json){    
    var jsonRaw = JSON.stringify(json, null, 4);
    fs.writeFileSync(filePath, jsonRaw);
}

export function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath));
}

export function dirname() {
    return url.fileURLToPath(new URL('.', import.meta.url));
}