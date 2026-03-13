import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'app-login',
	imports: [FormsModule],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
	private _auth = inject(AuthService);
	private _router = inject(Router);

	name = signal('');
	loading = signal(false);

	submit() {
		if (!this.name().trim()) return;
		this.loading.set(true);

		this._auth.login(this.name()).subscribe((token) => {
			this._auth.saveToken(token, this.name());
			this._router.navigate(['/lobby']);
		});
	}
}
