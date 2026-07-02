import { Component, OnInit, inject, signal } from '@angular/core';
import { LinkService, Link } from './link.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly svc = inject(LinkService);

  urlInput = signal('');
  submitting = signal(false);
  newLink = signal<Link | null>(null);
  formError = signal<string | null>(null);
  links = signal<Link[]>([]);

  ngOnInit(): void {
    this.loadLinks();
  }

  private loadLinks(): void {
    this.svc.list().subscribe({
      next: (data) => this.links.set(data),
      error: () => {},
    });
  }

  private isHttpUrl(raw: string): boolean {
    try {
      const { protocol } = new URL(raw);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }

  submit(e: Event): void {
    e.preventDefault();
    const url = this.urlInput().trim();
    if (!this.isHttpUrl(url)) {
      this.formError.set('Enter a valid http or https URL.');
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    this.newLink.set(null);
    this.svc.create(url).subscribe({
      next: (link) => {
        this.newLink.set(link);
        this.urlInput.set('');
        this.submitting.set(false);
        this.loadLinks();
      },
      error: (err) => {
        this.formError.set(err.error?.error ?? err.message ?? 'Request failed.');
        this.submitting.set(false);
      },
    });
  }
}
