import { __decorate } from "tslib";
import { html, css, LitElement, property } from 'lit-element';
export class HolochainPlaygroundCore extends LitElement {
    constructor() {
        super(...arguments);
        this.title = 'Hey there';
        this.counter = 5;
    }
    __increment() {
        this.counter += 1;
    }
    render() {
        return html `
      <h2>${this.title} Nr. ${this.counter}!</h2>
      <button @click=${this.__increment}>increment</button>
    `;
    }
}
HolochainPlaygroundCore.styles = css `
    :host {
      display: block;
      padding: 25px;
      color: var(--holochain-playground-core-text-color, #000);
    }
  `;
__decorate([
    property({ type: String })
], HolochainPlaygroundCore.prototype, "title", void 0);
__decorate([
    property({ type: Number })
], HolochainPlaygroundCore.prototype, "counter", void 0);
//# sourceMappingURL=HolochainPlaygroundCore.js.map