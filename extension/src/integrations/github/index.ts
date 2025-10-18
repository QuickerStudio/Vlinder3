/**
 * GitHub Integration Module
 */

// Router
export { githubRouter } from './router';

// Models
export { GitHubAccount, accountEquals, isDotComAccount, isEnterpriseAccount } from './models/account';
export type { IAPIEmail } from './models/account';

// Stores
export { GitHubAccountsStore } from './stores/accounts-store';
export { GitHubSignInStore, SignInStep } from './stores/signin-store';
export type { SignInResult } from './stores/signin-store';

