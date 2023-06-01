import {ChatPostMessageArguments, FilesInfoResponse, LogLevel, WebAPICallResult, WebClient} from "@slack/web-api";
import {FilesUploadV2Arguments} from "@slack/web-api/dist/methods";
import path from "path";

export default class SlackClient {
    private client: WebClient
    private imgShareChannelId: string
    private dataFolder: string

    constructor(options: SlackServiceOptions) {
        this.client = new WebClient(options.slackToken, {logLevel: LogLevel.WARN})
        this.imgShareChannelId = options.imgShareChannelId
        this.dataFolder = options.dataFolder ? options.dataFolder : 'slack'
    }

    async sendMessageToSlack(message: ChatPostMessageArguments) {
        try {
            await this.client.chat.postMessage(message)
        } catch (e) {
            console.log("Error occurred during sending message to slack", e)
        }
    }

    async uploadImageToSlack(failedTestsData: SlackFailedTest[]): Promise<SlackFailedTest[]> {
        if (!this.imgShareChannelId){
            return failedTestsData
        }
        let uploadData: FilesUploadV2Arguments = {
            file_uploads: [],
            channel_id: this.imgShareChannelId
        }
        for (let i: number = 0; i < failedTestsData.length; i++) {
            if (failedTestsData[i].image) {
                uploadData.file_uploads.push({
                    file: path.join(this.dataFolder, failedTestsData[i].image),
                    filename: failedTestsData[i].image
                })
            }
        }
        try {
            const result: WebAPICallResult = await this.client.files.uploadV2(uploadData)
            if (await this.verifyUpload(result)) {
                for (let i: number = 0; i < failedTestsData.length; i++) {
                    if (failedTestsData[i].image && Array.isArray(result.files)) {
                        const resultFile = result.files.find((file): boolean => {
                            return file.file.name === failedTestsData[i].image
                        })
                        if (resultFile !== undefined) {
                            failedTestsData[i].imageUrl = await this.getImageInfo<string>(resultFile.file.id, "thumb_360")
                        }
                    }
                }
            }

        } catch (e) {
            console.log("Error occurred during image upload to slack", e)
        }
        return failedTestsData
    }

    private async verifyUpload(result: WebAPICallResult): Promise<boolean> {
        if (Array.isArray(result.files)){
            try {
                for (const file of result.files) {
                    await this.waitForTrue(file.file.id, "is_public")
                }
            } catch (e) {
                console.log("Error occurred during Slack image upload verification", e)
                return false
            }
            return true
        } else throw Error("result.files returned from slack-api is not an array")
    }

    private async waitForTrue(fileId: string, info: string): Promise<boolean> {
        let answer: boolean = false
        for (let i: number = 0; i < 10; i++) {
            answer = await this.getImageInfo<boolean>(fileId, info)
            if (answer){
                return answer
            } else {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        console.log(`Could not verify that screenshot ${fileId} was uploaded and published to Slack`)
        return answer
    }

    private async getImageInfo<T>(fileId: string, info: string): Promise<T> {
        const result: FilesInfoResponse = await this.client.files.info({file: fileId})
        return await result.file[info] as T
    }
}