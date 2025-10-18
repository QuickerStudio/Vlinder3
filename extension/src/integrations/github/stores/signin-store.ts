/**
 * GitHub Sign In Store
 * Manages the sign-in flow with OAuth
 */

import { GitHubAccount } from '../models/account';
import { GitHubAccountsStore } from './accounts-store';
import * as vscode from 'vscode';

export enum SignInStep {
	Authentication = 'Authentication',
	Success = 'Success',
}

export type SignInState = IAuthenticationState | ISuccessState;

export interface IBaseSignInState {
	readonly kind: SignInStep;
	readonly error: Error | null;
	readonly loading: boolean;
}

export interface IAuthenticationState extends IBaseSignInState {
	readonly kind: SignInStep.Authentication;
	readonly endpoint: string;
}

export interface ISuccessState {
	readonly kind: SignInStep.Success;
	readonly account: GitHubAccount;
}

export type SignInResult =
	| { kind: 'success'; account: GitHubAccount }
	| { kind: 'cancelled' };

export class GitHubSignInStore {
	private static instance: GitHubSignInStore | null = null;
	private state: SignInState | null = null;
	private listeners: Set<(state: SignInState | null) => void> = new Set();
	private accountsStore: GitHubAccountsStore;

	private constructor() {
		this.accountsStore = GitHubAccountsStore.getInstance();
	}

	public static getInstance(): GitHubSignInStore {
		if (!GitHubSignInStore.instance) {
			GitHubSignInStore.instance = new GitHubSignInStore();
		}
		return GitHubSignInStore.instance;
	}

	public getState(): SignInState | null {
		return this.state;
	}

	public onDidUpdate(callback: (state: SignInState | null) => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	public reset(): void {
		this.setState(null);
	}

	public async beginDotComSignIn(): Promise<SignInResult> {
		const endpoint = 'https://api.github.com';

		if (this.state !== null) {
			this.reset();
		}

		const existingAccount = await this.accountsStore.getByEndpoint(endpoint);
		if (existingAccount) {
			await this.accountsStore.removeAccount(existingAccount);
		}

		this.setState({
			kind: SignInStep.Authentication,
			endpoint,
			error: null,
			loading: false,
		});

		return await this.authenticateWithBrowser(endpoint);
	}

	private async authenticateWithBrowser(endpoint: string): Promise<SignInResult> {
		const currentState = this.state;

		if (currentState?.kind !== SignInStep.Authentication) {
			return { kind: 'cancelled' };
		}

		this.setState({ ...currentState, loading: true });

		try {
			const session = await vscode.authentication.getSession(
				'github',
				['repo', 'user', 'write:discussion'],
				{ createIfNone: true }
			);

			if (!session) {
				throw new Error('Failed to get GitHub session');
			}

			const response = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `Bearer ${session.accessToken}`,
					Accept: 'application/vnd.github.v3+json',
				},
			});

			if (!response.ok) {
				throw new Error('Failed to fetch user information');
			}

			const userData = await response.json();

			const account = new GitHubAccount(
				userData.login,
				endpoint,
				session.accessToken,
				userData.email ? [{ 
					email: userData.email, 
					verified: true, 
					primary: true, 
					visibility: 'public' 
				}] : [],
				userData.avatar_url,
				userData.id,
				userData.name || userData.login,
				userData.plan?.name || 'free'
			);

			const savedAccount = await this.accountsStore.addAccount(account);

			if (!savedAccount) {
				throw new Error('Failed to save account');
			}

			this.setState({
				kind: SignInStep.Success,
				account: savedAccount,
			});

			return { kind: 'success', account: savedAccount };
		} catch (error: any) {
			console.error('GitHub authentication error:', error);
			
			if (currentState.kind === SignInStep.Authentication) {
				this.setState({
					...currentState,
					error: error instanceof Error ? error : new Error(error.message || 'Authentication failed'),
					loading: false,
				});
			}

			return { kind: 'cancelled' };
		}
	}

	private setState(state: SignInState | null): void {
		this.state = state;
		this.listeners.forEach(listener => listener(this.state));
	}
}

