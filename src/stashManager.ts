import { GitResponseError, SimpleGit } from "simple-git";
import * as vscode from "vscode";

export class GitStashManager {
    private git: SimpleGit;

    constructor(git: SimpleGit) {
        this.git = git;
    }

    async deleteStash(stashIndex: number) {
        try {
            await this.git.stash(["drop", `stash@{${stashIndex}}`]);
            vscode.window.showInformationMessage("Stash Deleted");
        } catch (error) {
            vscode.window.showErrorMessage("Failed to delete stash");
            console.error("Error deleting stash:", error);
        }
    }

    async applyStashOrCatchOverwrite(stashHash: string) {
        try {
            await this.git.stash(["apply", `${stashHash}`]);
        } catch (error) {
            const gitError = error as GitResponseError;
            const isOverwriteError = gitError.message.includes(" Your local changes to the following files would be overwritten by merge");
            if (isOverwriteError) {
                throw error;
            } else {
                vscode.window.showErrorMessage("Failed to apply stash");
                console.error("Error applying stash:", error);
            }
        }
    }

    async isFileModified(): Promise<boolean> {
        try {
            const status = await this.git.status();
            const modifiedFiles = status.modified.map((file) => file);

            const activeFilePath = vscode.window.activeTextEditor?.document.uri.fsPath;
            const isModified = modifiedFiles.some((file) => activeFilePath?.endsWith(file));

            return isModified;
        } catch (error) {
            console.error("Error checking if file is modified:", error);
            return false;
        }
    }

    async stashChanges(stashMessage: string) {
        try {
            const activeFilePath = vscode.window.activeTextEditor?.document.uri.fsPath;
            const result = await this.git.stash(["push", "-m", `"${stashMessage}"`, `${activeFilePath}`]);
            if (result.includes("No local changes to save")) {
                vscode.window.showErrorMessage("No Local Changes to save");
            }
        } catch (error) {
            vscode.window.showErrorMessage("Failed to stash change");
            console.error("Error stashing changes:", error);
        }
    }

    async getStashedItems() {
        try {
            const stashList = await this.git.stashList(["--stat"]);
            const relatedStashes = stashList.all.filter(stash => {
                const diff = stash?.diff;
                const filePath = diff?.files[0].file as string;
                if (vscode.window.activeTextEditor?.document.uri.fsPath.endsWith(filePath) && diff?.files.length === 1) {
                    return stash;
                }
            });
            return relatedStashes;
        } catch (error) {
            console.error("Error getting stashed items:", error);
            return [];
        }
    }

    async getBranchName(): Promise<string> {
        try {
            const branchSummary = await this.git.branch();
            return branchSummary.current;
        } catch (error) {
            return '';
        }
    }

    async cleanCurrentFileChanges() {
        const activeFilePath = vscode.window.activeTextEditor?.document.uri.fsPath as string;
        const fileName = activeFilePath.split("/").pop();
        try {
            await this.git.checkout(["--", activeFilePath]);
            vscode.window.showInformationMessage(`Changes in ${fileName} have been discarded`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to discard changes in ${fileName}`);
            console.error(`Error discarding changes in ${fileName}:`, error);
        }
    }
}