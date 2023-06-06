import fs from "fs";
import {rimraf} from "rimraf";
import path from "path";
import {debugLog} from "./logger";

export class FileUtils {
    static createIfNotExists(directory: string) {
        if (!fs.existsSync(directory)){
            fs.mkdirSync(directory);
        }
    }

    static async deleteIfExists(directory: string) {
        if (fs.existsSync(directory)){
            await rimraf(`${directory}`);
        }
    }

    static checkIfFileExists(directory: string, filePattern: RegExp): boolean {
        const files = fs.readdirSync(directory);
        const matchingFiles: string[] = [];
        for (let i = 0; i < files.length; i++){
            if (files[i].match(filePattern)){
                matchingFiles.push(files[i])
            }
        }
        return (matchingFiles.length == 1)
    }

    static async createAndWriteToFile(directory: string, fileName: string, data: string): Promise<void> {
        let overwrite: boolean = false
        if (this.checkIfFileExists(directory, RegExp(fileName))){overwrite = true}
        fs.writeFile(path.join(directory, fileName), data, (err) => {
            if (err) { throw err }
            debugLog(fileName + overwrite ? "overwritten" : "created")
        })
    }

    static async readAllJsonFilesInDirectory(directory: string, filePattern?: RegExp): Promise<any[]> {
        const files: string[] = fs.readdirSync(path.join(directory));
        const fileData: any[] = [];
        for (let i = 0; i < files.length; i++){
            let dataBuffer: Buffer
            if (filePattern !== undefined) {
                if (files[i].match(filePattern)) {
                    dataBuffer = fs.readFileSync(path.join(directory, files[i]))
                }
            } else {
                dataBuffer = fs.readFileSync(path.join(directory, files[i]))
            }
            try {
                if (dataBuffer) {
                    fileData.push(JSON.parse(dataBuffer.toString()))
                }
            } catch (e) {
                debugLog("Error when trying to read and JSON.parse file" + files[i])
                debugLog(e)
            }
        }
        return fileData
    }
}