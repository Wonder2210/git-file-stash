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

		const stashedItems = await gitStashManager.getStashed()
		const options: vscode.QuickPickItem[] = [...(stashedItems.map((item) => {
			let label = item.message;
			label = label && label.length ? label.match(/(?:"[^"]*"|^[^"]*$)/)?.[0].replace(/"/g, "") as string : "";

			return { label };
		})), {
			label: "",
			kind: vscode.QuickPickItemKind.Separator
		},
		{
			label: "Stash file",
		}];

		const quickPick = vscode.window.createQuickPick();

		quickPick.items = options;

		quickPick.onDidChangeSelection(async (e) => {
			const itemSelected = e[0];

			const stashSelected = stashedItems.find((item) => item.message.includes(itemSelected?.label || ""));
			const stashIndex = stashedItems.findIndex((item) => item.message.includes(itemSelected?.label || ""));

			multiStepInput(context, stashSelected, stashIndex).catch(console.error);


			if (itemSelected?.label === "Stash file") {
				showInputBox().then((res) => gitStashManager.gitStash(res ?? "default")).catch(console.error);
			}
		});

		quickPick.onDidHide(() => quickPick.dispose());

		quickPick.show();
	});

	context.subscriptions.push(command);
}
// This method is called when your extension is deactivated5
export function deactivate() { }
