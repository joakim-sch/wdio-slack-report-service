import {KnownBlock, DividerBlock, ImageElement, ActionsBlock, ContextBlock} from "@slack/types";
import {ChatPostMessageArguments} from "@slack/web-api";

export default class SlackMessageBuilder {
    failedTestBlockLimit: number
    slackChannelId: string
    messagePrefix: string
    slackNotification: string
    
    constructor(options: SlackServiceOptions) {
        this.slackChannelId = options.slackChannelId
        if (options.messageOptions) {
            this.failedTestBlockLimit = options.messageOptions.failedTestBlockLimit ? options.messageOptions.failedTestBlockLimit : 3
            this.messagePrefix = options.messageOptions.messagePrefix ? options.messageOptions.messagePrefix.trimEnd() + ": " : ""
            this.slackNotification = options.slackNotification ? options.slackNotification : 'WDIO Test report'
        }
    }

    createInitialMessage(): ChatPostMessageArguments {
        return {
            channel: this.slackChannelId,
            text: this.slackNotification,
            blocks: []
        }
    }

    createDivider(): DividerBlock {
        return {
            type: "divider"
        }
    }

    createFailedTestsBlocks(failedTestsData: SlackFailedTest[], failedTests: number, totalTests: number): KnownBlock[] {
        let blocks: KnownBlock[] = [{
            type: "header",
            text: {
                type: "plain_text",
                text: `${this.messagePrefix} Test run detected ${failedTests}/${totalTests} failed tests:`
            }
        }]
        blocks.push(this.createDivider())
        let testCounter: number = 0
        for (let i = 0; i < failedTestsData.length; i++) {
            if (i >= this.failedTestBlockLimit){
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `:heavy_plus_sign:${failedTests - testCounter} more failed tests omitted`
                    }
                })
                break
            }
            let imageAccessory: ImageElement = failedTestsData[i].imageUrl ? {
                    type: "image",
                    image_url: failedTestsData[i].imageUrl,
                    alt_text: `${failedTestsData[i].title} Screenshot`
                }
                : undefined
            if (failedTestsData[i].combined > 0){
                let combinedTitles = failedTestsData[i].title + "\n" + failedTestsData[i].combinedTitles.toString()
                combinedTitles = combinedTitles.replace(/,/g, "\n").trimStart()

                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*:stop: ${failedTestsData[i].combined + 1} tests failed with a similar error and were combined:*\n${combinedTitles}\n *Error message:* ${failedTestsData[i].errormessage}`
                    }
                })
                if (imageAccessory) {
                    blocks[blocks.length - 1]["accessory"] = imageAccessory
                }
                testCounter = testCounter + failedTestsData[i].combined + 1
                continue
            }
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `:warning: *${failedTestsData[i].title}*\n${failedTestsData[i].errormessage}`
                },
            })
            if (imageAccessory) {
                blocks[blocks.length - 1]["accessory"] = imageAccessory
            }
            testCounter++
        }

        return blocks
    }

    createTestReportBlock(options: DeploySlackOptions): ActionsBlock {
        let buildUrl: string
        let reportUrl: string
        let buildText: string
        switch (options.deployPipeline) {
            case DeployPipeline.Custom:
                buildUrl = encodeURI(options.buildUrl)
                reportUrl = options.reportUrl ? encodeURI(options.reportUrl) : undefined
                buildText = ':building_construction: Build'
                break
            case DeployPipeline.TeamCity:
                buildUrl = encodeURI(`${options.teamCityBaseUrl}/viewLog.html?buildId=${options.teamCityBuildId}&buildTypeId=${options.teamCityBuildTypeId}`)
                reportUrl = options.reportTabName ? encodeURI(`${buildUrl}&tab=${options.reportTabName}`) : undefined
                buildText = ':teamcity: TeamCity Build'
                break
            case DeployPipeline.GitHubActions:
                buildUrl = encodeURI(`${options.gitHubRepoUrl}/actions/runs/${options.gitHubActionRunNr}`) 
                reportUrl = options.gitHubPagesBaseUrl ? encodeURI(`${options.gitHubPagesBaseUrl}/${options.gitHubPagesVersion ? options.gitHubPagesVersion + '/' : ''}`) : undefined
                buildText = ':github: GitHub Actions Build'
        }
        let block: ActionsBlock = {
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: buildText,
                        emoji: true
                    },
                    value: 'click_me',
                    url: buildUrl,
                    action_id: 'build_button'
                }
            ]
        }
        if (reportUrl){
            block.elements.push({
                type: "button",
                text: {
                    type: "plain_text",
                    text: ':memo: Test-report',
                    emoji: true
                },
                value: 'click_me',
                url: reportUrl,
                action_id: 'report_button'
            })
        }
        return block
    }

    createWdioSlackReportServiceLinkBlock(): ContextBlock {
        return {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: 'Message is generated by <https://github.com/joakim-sch/wdio-slack-report-service|wdio-slack-report-service>'
                }
            ]
        }
    }
}