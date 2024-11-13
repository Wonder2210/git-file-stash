// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SimpleGit, simpleGit, CleanOptions, TaskOptions } from "simple-git";
import path from 'path';
import { showInputBox } from './input';
import { log } from 'console';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const git: SimpleGit = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath || "").clean(CleanOptions.FORCE);

	const gitStash = async (message: string) => {
		try {
			const file = vscode.window.activeTextEditor?.document.uri.fsPath;
			const res = await git.stash(["push", "-m", `"${message}"`, `${file}`]);
			if (res.includes("No local changes to save")) {
				vscode.window.showErrorMessage("No Local Changes to save");
			}
		}
		catch (error) {
			console.error(error);
		}
	};

	// TODO extract logic into a class to manage better the git

	const getStashed = async () => {
		const list = await git.stashList(["--stat"]);

		const relatedStash = list.all.filter(file => {
			const diff = file?.diff;

			const filer = diff?.files[0].file as string;

			if (vscode.window.activeTextEditor?.document.uri.fsPath.endsWith(filer) && diff?.files.length === 1) {
				return file;
			}
		});

		return relatedStash
	};
	// Use the hash to restore the file

	//  Untracked files ?


	//  Delete stashes using git stash drop stash@{index in the list}


	// Create a status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBarItem.text = 'Quick Select';
	statusBarItem.tooltip = 'View File Stash';
	statusBarItem.command = 'extension.openQuickSelect';
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);

	// Register the command that will be executed when the status bar button is clicked
	const command = vscode.commands.registerCommand('extension.openQuickSelect', () => {
		// TODO handle promises
		const stashedItems = (async () => {
			const res = await getStashed();
			return res;
		})();
		console.log(stashedItems);
		const options: vscode.QuickPickItem[] = [{
			label: "Action 1",
		}, {
			label: "Herer"
		}, {
			label: "Heredr"
		}, {
			label: "",
			kind: vscode.QuickPickItemKind.Separator
		},
		{
			label: "Stash file",
		}];

		const quickPick = vscode.window.createQuickPick();

		quickPick.items = options;

		quickPick.onDidChangeSelection((e) => {
			const itemSelected = e[0];
			console.log(itemSelected.label);

			if (itemSelected?.label === "Stash file") {
				console.log("selected");

				showInputBox().then((res) => gitStash(res ?? "DefaULR")).catch(console.error);
			}

		});

		quickPick.onDidHide(() => quickPick.dispose());

		quickPick.show();

	});

	context.subscriptions.push(command);
}
// This method is called when your extension is deactivated
export function deactivate() { }
