import type { Capabilities, Options, Services } from '@wdio/types'
import {RemoteCapabilities, RemoteCapability} from "@wdio/types/build/Capabilities";
import {Test, TestResult} from "@wdio/types/build/Frameworks";
import {Testrunner} from "@wdio/types/build/Options";
import {debugLog, initDebugLog} from "./lib/logger";
import {FileUtils} from "./lib/fileUtil";
import SlackClient from "./lib/SlackClient";
import SlackMessageBuilder from "./lib/SlackMessageBuilder";
import SlackMessageEnhancer from "./lib/SlackMessageEnhancer";
import path from "path";
import {ChatPostMessageArguments} from "@slack/web-api";

export default class SlackService implements Services.ServiceInstance {
    private serviceOptions: SlackServiceOptions
    private dataFolder: string
    private totalTests: number
    private failedTests: number
    private failedTestData: SlackFailedTest[]
    
    constructor(private _serviceOptions: SlackServiceOptions, private _capabilities: Capabilities.RemoteCapability, private _config: Omit<Options.Testrunner, 'capabilities'>) {
        this.serviceOptions = _serviceOptions
        this.dataFolder = _serviceOptions.dataFolder ? _serviceOptions.dataFolder : 'slack'
        this.totalTests = 0
        this.failedTests = 0
        this.failedTestData = []
    }
    
    private addFailedTest(value: SlackFailedTest) {
        debugLog(`Adding failed test data:\n${JSON.stringify(value, null, 4)}`)
        this.failedTestData.push(value);
        this.failedTests++
    }

    private async sendSlackNotification(failedTestData: SlackFailedTest[], failedTests: number, totalTests: number) {
        const slackClient = new SlackClient(this.serviceOptions)
        const slackMessageBuilder = new SlackMessageBuilder(this.serviceOptions)
        const slackMessageEnhancer = new SlackMessageEnhancer(this.serviceOptions)
        
        //Create initial message
        let slackMessage: ChatPostMessageArguments = slackMessageBuilder.createInitialMessage()
        
        //Enhance failed test data (combining errors and limiting sizes)
        failedTestData = slackMessageEnhancer.enhanceFailedTests(failedTestData)
        
        //Upload screenshot thumbnails
        if (this.serviceOptions.imgShareChannelId){
            failedTestData = await slackClient.uploadImageToSlack(failedTestData)
        }
        
        //Add enhanced tests data to message
        slackMessage.blocks.push(...slackMessageBuilder.createFailedTestsBlocks(failedTestData, failedTests, totalTests))
        
        //Add link buttons to build and test report
        if ("deployPipeline" in this.serviceOptions) {
            slackMessage.blocks.push(slackMessageBuilder.createTestReportBlock(this.serviceOptions))
        }
        
        //Add link to wdio-slack-report-service
        slackMessage.blocks.push(slackMessageBuilder.createWdioSlackReportServiceLinkBlock())
        
        debugLog("Sending slack message:\n" + JSON.stringify(slackMessage, null, 4))
        
        await slackClient.sendMessageToSlack(slackMessage)
    }
    
    
    /*HOOKS*/
    onPrepare(config: Testrunner, capabilities: RemoteCapabilities): void | Promise<void> {
        if (this.serviceOptions.enable){
            initDebugLog(this.serviceOptions.debug)
            if (this.serviceOptions.debug) {
                const safeServiceOptions = this.serviceOptions
                safeServiceOptions.slackToken = "*hidden*"
                debugLog("serviceOptions:" + JSON.stringify(this.serviceOptions, null, 4))
            }
            FileUtils.deleteIfExists(`.${path.sep}${this.dataFolder}${path.sep}`, "*");
            FileUtils.createIfNotExists(`.${path.sep}${this.dataFolder}${path.sep}`);
        }
    }

    async afterTest(test: Test, context: any, result: TestResult): Promise<void> {
        if (this.serviceOptions.enable) {
            if (test._currentRetry === test._retries || test._retries === 0) {
                this.totalTests++
                if (!result.passed) {
                    const datenow: string = this.serviceOptions.imgShareChannelId ? Date.now().toString() : undefined
                    if (datenow) {
                        await browser.saveScreenshot(`.${path.sep}${this.dataFolder}${path.sep}${datenow}.png`)
                    }
                    this.addFailedTest({
                        title: `${test.parent} - ${test.title}`,
                        errormessage: result.error.message.replace(/[\u001b\u009b][-[+()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ""),
                        image: datenow ? `${datenow}.png` : undefined,
                        combined: 0
                    })
                }
            } else if (result.passed) {
                this.totalTests++
            }
        }
    }
    
    async afterHook(test: Test, context: any, result: TestResult): Promise<void> {
        if (this.serviceOptions.enable && !result.passed) {
            const datenow: string = this.serviceOptions.imgShareChannelId ? Date.now().toString() : undefined
            if (datenow) {
                await browser.saveScreenshot(`.${path.sep}${this.dataFolder}${path.sep}${datenow}.png`)
            }
            this.addFailedTest({
                title: `${test.parent} - ${test.title}`,
                errormessage: result.error.message.replace(/[\u001b\u009b][-[+()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ""),
                image: datenow ? `${datenow}.png` : undefined,
                combined: 0
            })
            this.totalTests++
        }
    }
    
    async after(result: number, capabilities: RemoteCapability, specs: string[]): Promise<void> {
        if (this.serviceOptions.enable) {
            const data: string = JSON.stringify({failedTestData: this.failedTestData, failedTests: this.failedTests, totalTests: this.totalTests}, null, 4)
            await FileUtils.createAndWriteToFile(this.dataFolder, `${Date.now().toString()}slackData.json`, data)
        }
    }
    
    async onComplete(exitCode: number, config: Omit<Testrunner, "capabilities">, capabilities: RemoteCapabilities, results: any): Promise<void> {
        if (this.serviceOptions.enable && exitCode === 1) {
            const dataFiles: any[] = await FileUtils.readAllJsonFilesInDirectory(this.dataFolder, new RegExp("slackData\\.json$"))
            let failedTestData: SlackFailedTest[] = []
            let failedTests: number = 0
            let totalTests: number = 0
            dataFiles.forEach((dataFile, index, array) => {
                dataFile.failedTestData.forEach((data) => {
                    failedTestData.push(data)
                })
                failedTests = failedTests + dataFile.failedTests
                totalTests = totalTests + dataFile.totalTests
            })
            if (failedTests > 0) {
                await this.sendSlackNotification(failedTestData, failedTests, totalTests)
            } else {
                debugLog(`onComplete hook detected exitCode 1, but no failed tests.`)
            }
        }
    }
}