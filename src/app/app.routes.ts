import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'login',
		pathMatch: 'full',
	},
	{
		path: 'login',
		loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
	},
	{
		path: 'lobby',
		loadComponent: () => import('./pages/lobby/lobby.component').then((m) => m.LobbyComponent),
	},
];
