export class PageStylesheet {
  private style: HTMLStyleElement | null = null

  constructor(private readonly css: string) {}

  attach(): void {
    if (this.style) return
    this.style = document.createElement('style')
    this.style.textContent = this.css
    document.head.appendChild(this.style)
  }

  detach(): void {
    this.style?.remove()
    this.style = null
  }
}
