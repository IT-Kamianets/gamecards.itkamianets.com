import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnDestroy,
	OnInit,
	signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrl: './game.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
	protected _auth = inject(AuthService);
	protected _gameService = inject(GameService);
	private _router = inject(Router);
	private _route = inject(ActivatedRoute);

	private _interval: any;

	game = signal(this._gameService.game());
	myCards = signal(this._gameService.myCards());
	loading = signal(true);

	get gameId() {
		return this._route.snapshot.params['id'];
	}

	ngOnInit() {
		if (!this._auth.token()) {
			this._router.navigate(['/login']);
			return;
		}
		this.loadGame();
		this._interval = setInterval(() => this.loadGame(), 3000);
	}

	ngOnDestroy() {
		clearInterval(this._interval);
	}

	loadGame() {
		this._gameService.loadGame(this.gameId).subscribe((game) => {
			this._gameService.game.set(game);
			this.game.set(game);
			this.loading.set(false);

			console.log('Game loaded:', game); // DEBUG

			if (game.status === 'running' && this.isPlayer()) {
				console.log('Loading my cards for game:', this.gameId); // DEBUG

				this._gameService.loadMyCards(this.gameId).subscribe({
					next: (cards) => {
						console.log('My cards received:', cards); // DEBUG
						this._gameService.myCards.set(cards);
						this.myCards.set(cards);
					},
					error: (err) => {
						console.error('Error loading cards:', err); // DEBUG
					},
				});
			}
		});
	}

	joinGame() {
		this._gameService.joinGame(this.gameId).subscribe((game) => {
			if (game) {
				this._gameService.game.set(game);
				this.game.set(game);
			}
		});
	}

	startGame() {
		this._gameService.startGame(this.gameId).subscribe((game) => {
			if (game) {
				this._gameService.game.set(game);
				this.game.set(game);
			}
		});
	}

	isCreator() {
		return this.game()?.creator._id === this._auth.user()?._id;
	}

	isPlayer() {
		return this.game()?.players.some((p) => p._id === this._auth.user()?._id);
	}

	backToLobby() {
		this._router.navigate(['/lobby']);
	}
}
