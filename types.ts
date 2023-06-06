export interface SlackFailedTest {
    title: string,
    errormessage: string,
    image?: string
    imageUrl?: string,
    combined: number
    combinedTitles?: string[]
    deleted?: boolean
}

export declare type SlackServiceOptions = BaseSlackOptions | DeploySlackOptions
export declare type DeploySlackOptions = CustomSlackOptions | TeamCitySlackOptions | GitHubActionsSlackOptions

export interface BaseSlackOptions {
    enable: boolean
    dataFolder?: string,
    slackToken: string,
    slackChannelId: string,
    imgShareChannelId?: string,
    slackNotification?: string,
    messageOptions?: MessageOptions,
    debug?: boolean,
    testMode?: boolean
}
interface MessageOptions {
    messagePrefix?: string,
    levenshteinLimit?: number,
    linesLimit?: number,
    charLimit?: number,
    shortenCombinedBlocks?: boolean,
    failedTestBlockLimit?: number
}
export interface CustomSlackOptions extends BaseSlackOptions{
    deployPipeline: DeployPipeline.Custom,
    buildUrl: string,
    reportUrl?: string
}
export interface TeamCitySlackOptions extends BaseSlackOptions {
    deployPipeline: DeployPipeline.TeamCity,
    teamCityBaseUrl: string,
    teamCityBuildId: string,
    teamCityBuildTypeId: string,
    reportTabName?: string
}
export interface GitHubActionsSlackOptions extends BaseSlackOptions {
    deployPipeline: DeployPipeline.GitHubActions,
    gitHubRepoUrl: string
    gitHubActionRunNr: number | string
    gitHubPagesBaseUrl?: string,
    gitHubPagesVersion?: number | string
}
export enum DeployPipeline {
    Custom = 'Custom',
    TeamCity = 'TeamCity',
    GitHubActions = 'GitHubActions'
}