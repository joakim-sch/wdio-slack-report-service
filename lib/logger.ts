import fs from "fs";
import pck from '../package.json'

let debugMode = false

export function initDebugLog(debug: boolean) {
    if (debug){
        debugMode = true
        fs.writeFileSync('wdio-slack-report-service-debug.log', `Start ${pck.name} ${pck.version}\n`)
    }
}
export function debugLog(message: string) {
    if (debugMode){
        fs.appendFileSync('wdio-slack-report-service-debug.log', `${message}\n`)
    }
}