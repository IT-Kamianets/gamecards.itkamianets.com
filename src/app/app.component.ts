import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: '<router-outlet />',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
	private _httpClient = inject(HttpClient);

	constructor() {
		console.log('start');

		this._httpClient
			.post<string>('https://api.webart.work/api/cardgame/token', {
				name: 'Denys',
			})
			.subscribe((token) => {
				this._httpClient
					.get('https://api.webart.work/api/cardgame/games', {
						headers: {
							token,
						},
					})
					.subscribe((games) => {
						console.log(games);
					});
			});
	}
}
