interface SlackFailedTest {
    title: string,
    errormessage: string,
    image?: string
    imageUrl?: string,
    combined: number
    combinedTitles?: string[]
    deleted?: boolean
}

declare type SlackServiceOptions = BaseSlackOptions | DeploySlackOptions
declare type DeploySlackOptions = CustomSlackOptions | TeamCitySlackOptions | GitHubActionsSlackOptions

interface BaseSlackOptions {
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
interface CustomSlackOptions extends BaseSlackOptions{
    deployPipeline: DeployPipeline.Custom,
    buildUrl: string,
    reportUrl?: string
}
interface TeamCitySlackOptions extends BaseSlackOptions {
    deployPipeline: DeployPipeline.TeamCity,
    teamCityBaseUrl: string,
    teamCityBuildId: string,
    teamCityBuildTypeId: string,
    reportTabName?: string
}
interface GitHubActionsSlackOptions extends BaseSlackOptions {
    deployPipeline: DeployPipeline.GitHubActions,
    gitHubRepoUrl: string
    gitHubActionRunNr: number | string
    gitHubPagesBaseUrl?: string,
    gitHubPagesVersion?: number | string
}
enum DeployPipeline {
    Custom = 'Custom',
    TeamCity = 'TeamCity',
    GitHubActions = 'GitHubActions'
}