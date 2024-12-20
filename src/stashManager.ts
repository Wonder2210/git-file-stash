import { GitResponseError, SimpleGit } from "simple-git";
import * as vscode from "vscode";

export class GitStashManager {
    private git: SimpleGit;

    constructor(git: SimpleGit) {
        this.git = git;
    }

    async deleteStash(index: number) {
        try {
            await this.git.stash(["drop", `stash@{${index}}`]);
            vscode.window.showInformationMessage("Stash Deleted");
        } catch (error) {
            console.error(error);
        }
    }

    async applyStashOrCatchOverwrite(hash: string, file: string) {
        try {
            await this.git.stash(["apply", `${hash}`]);
            vscode.window.showInformationMessage("File Restored");
            vscode.window.showTextDocument(vscode.Uri.file(file));
        } catch (error) {
            const gitError = error as GitResponseError;
            const isOverwriteError = gitError.message.includes(" Your local changes to the following files would be overwritten by merge");
            if (isOverwriteError) {
                throw error;
            }
        }
    }

    async getFileIsModified(): Promise<boolean> {
        try {
            const status = await this.git.status();
            const filesModified = status.modified.map((file) => file);

            const fileRelativePath = vscode.window.activeTextEditor?.document.uri.fsPath;
            const isModified = filesModified.some((file) => fileRelativePath?.endsWith(file));

            return !!isModified;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async gitStash(message: string) {
        try {
            const file = vscode.window.activeTextEditor?.document.uri.fsPath;
            const res = await this.git.stash(["push", "-m", `"${message}"`, `${file}`]);
            if (res.includes("No local changes to save")) {
                vscode.window.showErrorMessage("No Local Changes to save");
            }
        } catch (error) {
            console.error(error);
        }
    }

    async getStashed() {
        try {
            const list = await this.git.stashList(["--stat"]);
            const relatedStash = list.all.filter(file => {
                const diff = file?.diff;
                const filer = diff?.files[0].file as string;
                if (vscode.window.activeTextEditor?.document.uri.fsPath.endsWith(filer) && diff?.files.length === 1) {
                    return file;
                }
            });
            return relatedStash;
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async cleanFile() {
        try {
            const file = vscode.window.activeTextEditor?.document.uri.fsPath;
            await this.git.checkout(["--", `${file}`]);
        } catch (error) {
            console.error(error);
        }
    }
}