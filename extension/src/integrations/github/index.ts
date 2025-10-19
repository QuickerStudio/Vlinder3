/**
 * GitHub Integration Module
 */

// Router
export { githubRouter } from './router';

// Models & Stores (consolidated in account.ts)
export { 
	GitHubAccount, 
	accountEquals, 
	isDotComAccount, 
	isEnterpriseAccount,
	GitHubAccountsStore,
	GitHubSignInStore,
	SignInStep
} from './models/account';
export type { IAPIEmail, SignInResult } from './models/account';

