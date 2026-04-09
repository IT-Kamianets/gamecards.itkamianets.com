import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnDestroy,
	OnInit,
	signal,
	computed,
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
	myCards = signal<string[]>([]);
	loading = signal(true);

	// Захист: вибрана карта з руки → потім клік по атакуючій на столі
	selectedCard = signal<string | null>(null);
	defendMode = signal(false);

	get gameId() {
		return this._route.snapshot.params['id'];
	}

	get myId() {
		return this._auth.user()?._id ?? '';
	}

	isAttacker = computed(() => this.game()?.data?.attacker === this.myId);
	isDefender = computed(() => this.game()?.data?.defender === this.myId);
	isMyTurn = computed(() => this.isAttacker() || this.isDefender());

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

			if (game.status === 'running' && this.isPlayer()) {
				this._gameService.loadMyCards(this.gameId).subscribe({
					next: (cards) => {
						this._gameService.myCards.set(cards);
						this.myCards.set(cards);
					},
					error: (err) => console.error('Error loading cards:', err),
				});
			}
		});
	}

	joinGame() {
		this._gameService.joinGame(this.gameId).subscribe((game) => {
			if (game) {
				this.game.set(game);
			}
		});
	}

	startGame() {
		this._gameService.startGame(this.gameId).subscribe((game) => {
			if (game) {
				this.game.set(game);
				this.loadGame();
			}
		});
	}

	// ─── Ігрова логіка ───────────────────────────────────────────

	onHandCardClick(card: string) {
		if (!this.isMyTurn()) return;

		if (this.isAttacker()) {
			this.attack(card);
			return;
		}

		if (this.isDefender()) {
			if (this.selectedCard() === card) {
				this.selectedCard.set(null);
				this.defendMode.set(false);
			} else {
				this.selectedCard.set(card);
				this.defendMode.set(true);
			}
		}
	}

	onAttackCardClick(attackCard: string) {
		if (!this.isDefender() || !this.defendMode() || !this.selectedCard()) return;

		const pair = this.game()?.data?.table?.find((p) => p.attack === attackCard && !p.defend);
		if (!pair) return;

		this.defend(attackCard, this.selectedCard()!);
		this.selectedCard.set(null);
		this.defendMode.set(false);
	}

	attack(card: string) {
		this._gameService.makeMove(this.gameId, 'attack', { card }).subscribe((game) => {
			if (game) {
				this.game.set(game);
				this.loadGame();
			}
		});
	}

	defend(attackCard: string, card: string) {
		this._gameService
			.makeMove(this.gameId, 'defend', { attackCard, card })
			.subscribe((game) => {
				if (game) {
					this.game.set(game);
					this.loadGame();
				}
			});
	}

	take() {
		if (!this.isDefender()) return;
		this._gameService.makeMove(this.gameId, 'take').subscribe((game) => {
			if (game) {
				this.game.set(game);
				this.loadGame();
			}
		});
	}

	done() {
		this._gameService.makeMove(this.gameId, 'done').subscribe((game) => {
			if (game) {
				this.game.set(game);
				this.loadGame();
			}
		});
	}

	cancelDefendSelect() {
		this.selectedCard.set(null);
		this.defendMode.set(false);
	}

	// ─── Helpers ─────────────────────────────────────────────────

	isPlayer() {
		return this.game()?.players.some((p) => p._id === this.myId);
	}

	isCreator() {
		return this.game()?.creator._id === this.myId;
	}

	playerName(playerId: string) {
		return this.game()?.players.find((p) => p._id === playerId)?.name ?? 'Невідомий';
	}

	cardColor(card: string): 'red' | 'black' {
		const suit = card.slice(-1);
		return suit === '♥' || suit === '♦' ? 'red' : 'black';
	}

	isTrumpSuit(card: string): boolean {
		const trump = this.game()?.data?.trump;
		if (!trump) return false;
		return card.slice(-1) === trump.slice(-1);
	}

	hasOpenAttacks() {
		return this.game()?.data?.table?.some((p) => !p.defend) ?? false;
	}

	allDefended() {
		const table = this.game()?.data?.table;
		return table && table.length > 0 && table.every((p) => !!p.defend);
	}

	backToLobby() {
		this._router.navigate(['/lobby']);
	}
}
