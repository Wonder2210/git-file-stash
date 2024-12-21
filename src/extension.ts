import * as vscode from 'vscode';
import { SimpleGit, simpleGit, CleanOptions } from "simple-git";
import { showInputBox } from './input';
import { multiStepInput } from './multiStepInput';
import { GitStashManager } from './stashManager';

export function activate(context: vscode.ExtensionContext) {
    // Create a status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = 'File Stash';
    statusBarItem.tooltip = 'View File Stash';
    statusBarItem.command = 'extension.openQuickSelect';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    const git: SimpleGit = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath || "").clean(CleanOptions.FORCE);

    const gitStashManager = new GitStashManager(git);

    // Register the command that will be executed when the status bar button is clicked
    const command = vscode.commands.registerCommand('extension.openQuickSelect', async () => {

        const stashedItems = await gitStashManager.getStashedItems();
        const quickPickOptions: vscode.QuickPickItem[] = [
            ...stashedItems.map((stashItem) => {
                let label = stashItem.message;
                // Extract the label from the stash message, removing quotes if present
                label = label && label.length ? label.match(/(?:"[^"]*"|^[^"]*$)/)?.[0].replace(/"/g, "") as string : "";
                return { label };
            }),
            {
                label: "",
                kind: vscode.QuickPickItemKind.Separator
            },
            {
                label: "Stash file",
            }
        ];

        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "File Stash List";
        quickPick.items = quickPickOptions;

        quickPick.onDidChangeSelection(async (selectedItems) => {
            const selectedItem = selectedItems[0];

            const selectedStash = stashedItems.find((stashItem) => stashItem.message.includes(selectedItem?.label || ""));
            const selectedStashIndex = stashedItems.findIndex((stashItem) => stashItem.message.includes(selectedItem?.label || ""));

            // Call multi-step input process for the selected stash
            multiStepInput(selectedStash, selectedStashIndex).catch(console.error);

            if (selectedItem?.label === "Stash file") {
                const defaultStashName = await (async () => {
                    const currentBranchName = await gitStashManager.getBranchName();
                    const currentFileName = vscode.window.activeTextEditor?.document.fileName.split("/").pop();
                    const generatedStashName = `${currentFileName} from ${currentBranchName}`;
                    // Count occurrences of the generated stash name to avoid duplicates
                    const occurrenceCount = quickPickOptions.filter(({ label }) => label.includes(generatedStashName)).length;
                    return occurrenceCount ? `${generatedStashName}-${occurrenceCount + 1}` : generatedStashName;
                })();

                showInputBox({
                    validate: (inputValue: string) => {
                        // Validate if the stash name already exists
                        const isDuplicateName = quickPickOptions.find(({ label }) => label === inputValue);
                        if (isDuplicateName) {
                            return "A stash with this name already exists";
                        }
                        return null;
                    },
                    value: defaultStashName,
                }).then((inputResult) => {
                    if (inputResult) {
                        gitStashManager.stashChanges(inputResult);
                    }
                }).catch(console.error);
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    });

    context.subscriptions.push(command);
}

// This method is called when your extension is deactivated
export function deactivate() { }
