import {SlackFailedTest, SlackServiceOptions} from "../types";

export default class SlackMessageEnhancer {
    levenshteinLimit: number
    linesLimit: number
    charLimit: number
    shortenCombinedBlocks: boolean

    constructor(options: SlackServiceOptions) {
        this.levenshteinLimit = options.messageOptions && options.messageOptions.levenshteinLimit ? options.messageOptions.levenshteinLimit : 15
        this.linesLimit = options.messageOptions && options.messageOptions.linesLimit ? options.messageOptions.linesLimit : 4
        this.charLimit = options.messageOptions && options.messageOptions.charLimit ? options.messageOptions.charLimit : 200
        this.shortenCombinedBlocks = options.messageOptions && options.messageOptions.shortenCombinedBlocks ? options.messageOptions.shortenCombinedBlocks : false
    }

    enhanceFailedTests(failedTests: SlackFailedTest[]): SlackFailedTest[] {
        failedTests = this.cleanupErrorMessages(failedTests)
        failedTests = this.combineSimilar(failedTests)
        failedTests = this.limitErrorMessageSize(failedTests)
        failedTests.sort((a, b) => b.combined-a.combined)
        return failedTests
    }

    private cleanupErrorMessages(failedTests: SlackFailedTest[]): SlackFailedTest[] {
        failedTests.forEach((failedTest: SlackFailedTest) => {
            failedTest.errormessage.replace(/[\u001b\u009b][-[+()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
        })
        return failedTests
    }

    private limitErrorMessageSize(failedTests: SlackFailedTest[]): SlackFailedTest[] {
        failedTests.forEach((failedTest: SlackFailedTest) => {
            let shortened: boolean = false
            if (failedTest.combined === 0 || this.shortenCombinedBlocks) {
                if (failedTest.errormessage.split('\n').length > this.linesLimit) {
                    shortened = true
                    const parts: string[] = failedTest.errormessage.split('\n', this.linesLimit)
                    failedTest.errormessage = ""
                    parts.forEach((part: string, index: number, array: string[]) => {
                        if (index !== 0) {
                            failedTest.errormessage = failedTest.errormessage.concat('\n')
                        }
                        failedTest.errormessage = failedTest.errormessage.concat(part)
                    })
                }
                if (failedTest.errormessage.length > this.charLimit) {
                    shortened = true
                    failedTest.errormessage = failedTest.errormessage.slice(0, this.charLimit - 1)
                }
                if (shortened) {
                    failedTest.errormessage = failedTest.errormessage.concat("[...]")
                }
            }
        })
        return failedTests
    }

    private combineSimilar(failedTests: SlackFailedTest[]): SlackFailedTest[] {
        let combinedArray: SlackFailedTest[] = []
        for (let i = 0; i < failedTests.length; i++) {
            if (!failedTests[i].deleted) {
                combinedArray.push(failedTests[i])
                for (let j = i + 1; j < failedTests.length; j++) {
                    if (!failedTests[j].deleted) {
                        const diffrate = this.levenshteinDistance(failedTests[i].errormessage, failedTests[j].errormessage)
                        if (diffrate < this.levenshteinLimit) {
                            if (!Array.isArray(combinedArray[combinedArray.length - 1].combinedTitles)) {combinedArray[combinedArray.length - 1].combinedTitles = []}
                            combinedArray[combinedArray.length - 1].combined++
                            combinedArray[combinedArray.length - 1].combinedTitles.push(failedTests[j].title)
                            failedTests[j].deleted = true
                        }
                    }
                }
            }
        }
        return combinedArray
    }


    private levenshteinDistance(str1: string, str2: string): number {
        const track = Array(str2.length + 1).fill(null).map(() =>
            Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i += 1) {
            track[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j += 1) {
            track[j][0] = j;
        }
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator, // substitution
                );
            }
        }
        return track[str2.length][str1.length];
    }
}