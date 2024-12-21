/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import simpleGit, { CleanOptions, DefaultLogFields, SimpleGit, ListLogLine } from 'simple-git';
import { QuickPickItem, window, Disposable, QuickInputButton, QuickInput, QuickInputButtons, Uri } from 'vscode';
import * as vscode from 'vscode';
import { GitStashManager } from './stashManager';

/**
 * A multi-step input using window.createQuickPick() and window.createInputBox().
 * 
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
type StashInfo = (DefaultLogFields & ListLogLine) | undefined
export async function multiStepInput(stashInfo: StashInfo, stashIndex: number) {

	const git: SimpleGit = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath || "").clean(CleanOptions.FORCE);

	const gitStashManager = new GitStashManager(git);

	class MyButton implements QuickInputButton {
		constructor(public iconPath: { light: Uri; dark: Uri; }, public tooltip: string) { }
	}

	const stashActions: QuickPickItem[] = ['Delete', 'Apply']
		.map(label => ({ label }));

	const overwriteOptions: QuickPickItem[] = ['Clean and apply', 'Cancel'].map(label => ({ label }));


	interface MultiStepState {
		title: string;
		resourceGroup: QuickPickItem | string;
		name: string;
		selectedOption: QuickPickItem;
		action: QuickPickItem;
		updatedValue: string;
	}

	async function collectInputs() {
		const state = {} as Partial<MultiStepState>;
		await MultiStepInput.run(input => selectStashAction(input, state, stashInfo));
		return state as MultiStepState;
	}

	const title = 'Stash File';

	async function selectStashAction(input: MultiStepInput, state: Partial<MultiStepState>, stash: StashInfo) {
		const pick = await input.showQuickPick({
			title,
			placeholder: 'Choose a stash action',
			items: stashActions,
			activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
			shouldResume: shouldResume
		});
		if (pick.label === "Apply") {
			try {
				await gitStashManager.applyStashOrCatchOverwrite(stash?.hash || "");
			} catch (error) {
				return (input: MultiStepInput) => overwriteFile(input, state, stash);
			}

		}
		if (pick.label === "Delete") {
			try {
				await gitStashManager.deleteStash(stashIndex);
			} catch (error) {
				console.error(error);
			}
		}
		state.resourceGroup = pick;
	}

	async function overwriteFile(input: MultiStepInput, state: Partial<MultiStepState>, stash: StashInfo) {
		const pick = await input.showQuickPick({
			title,
			placeholder: 'Your local changes would be overwritten by merge',
			items: overwriteOptions,
			activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
			shouldResume: shouldResume
		});

		if (pick.label === "Clean and apply") {
			try {
				await gitStashManager.cleanCurrentFileChanges();

				setTimeout(async () => {
					await gitStashManager.applyStashOrCatchOverwrite(stash?.hash || "");
				}, 200);

			} catch (error) {
				console.error(error);
			}
		}

	}

	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((_resolve, _reject) => {
			// noop
		});
	}

	await collectInputs();
}


// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
	title: string;
	items: T[];
	activeItem?: T;
	ignoreFocusOut?: boolean;
	placeholder: string;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

	static async run(start: InputStep) {
		const input = new MultiStepInput();
		return input.stepThrough(start);
	}

	private current?: QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough(start: InputStep) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, items, activeItem, ignoreFocusOut, placeholder, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createQuickPick<T>();
				input.title = title;
				input.ignoreFocusOut = ignoreFocusOut ?? false;
				input.placeholder = placeholder;
				input.items = items;
				if (activeItem) {
					input.activeItems = [activeItem];
				}
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve((item as any));
						}
					}),
					input.onDidChangeSelection(items => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}

}