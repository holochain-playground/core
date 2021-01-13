import { html, fixture, expect } from '@open-wc/testing';
import '../holochain-playground-core.js';
describe('HolochainPlaygroundCore', () => {
    it('has a default title "Hey there" and counter 5', async () => {
        const el = await fixture(html `<holochain-playground-core></holochain-playground-core>`);
        expect(el.title).to.equal('Hey there');
        expect(el.counter).to.equal(5);
    });
    it('increases the counter on button click', async () => {
        const el = await fixture(html `<holochain-playground-core></holochain-playground-core>`);
        el.shadowRoot.querySelector('button').click();
        expect(el.counter).to.equal(6);
    });
    it('can override the title via attribute', async () => {
        const el = await fixture(html `<holochain-playground-core title="attribute title"></holochain-playground-core>`);
        expect(el.title).to.equal('attribute title');
    });
    it('passes the a11y audit', async () => {
        const el = await fixture(html `<holochain-playground-core></holochain-playground-core>`);
        await expect(el).shadowDom.to.be.accessible();
    });
});
//# sourceMappingURL=holochain-playground-core.test.js.map