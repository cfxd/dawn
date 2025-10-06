if (!customElements.get('cart-form')) {
  customElements.define(
    'cart-form',
    class CartForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.submitButton = this.querySelector('[type="submit"]');
        this.spinnerEl = this.form.querySelector('.loading__spinner');

        this.cartUrlPrefix = this.form.dataset.cartUrl;
        this.cartUrlEl = this.querySelector('[name="cartUrl"]');
        this.cartUrl = this.cartUrlEl.value;

        this.qrCodeEl = this.querySelector('#qrcode');
        this.qrCode = new QRCode(this.qrCodeEl, this.cartUrl);
      }

      quantityUpdateUnsubscriber = undefined;

      connectedCallback() {
        this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.updateCartUrl.bind(this));
      }

      disconnectedCallback() {
        if (this.quantityUpdateUnsubscriber) {
          this.quantityUpdateUnsubscriber();
        }
      }

      updateCartUrl(evt) {
        this.resetFormMessages();
        const cartItemsForUrl = evt.cartData.items.map((el) => `${el.variant_id}:${el.quantity}`).join(',');
        this.cartUrl = `${this.cartUrlPrefix}${cartItemsForUrl}`;
        if (evt.cartData.items.length === 0) {
          this.submitButton.setAttribute('aria-disabled', true);
          this.form.querySelector('.form-empty').classList.remove('hidden');
        }
      }

      resetFormMessages() {
        this.querySelectorAll('.form__message span').forEach((el) => el.classList.add('hidden'));
      }

      async onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.resetFormMessages();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        formData.set('cartUrl', `${this.cartUrl}<br><br>`);
        formData.append('imageBase64', this.qrCodeEl?.querySelector('img')?.src?.split('base64,')[1]);

        try {
          // const res = await fetch('https://n6pr6x554juo7ew5fy5ahnhvp40zdcqd.lambda-url.us-east-1.on.aws/', {  // this one sends WITHOUT an attachment
          const res = await fetch('https://r5uujk7wg4n7b4okbqzh2xfcd40ostsb.lambda-url.us-east-1.on.aws/', {
            // this one sends WITH an attachment
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData.entries())),
          });
          /*
          const res = await fetch(`https://webhooks.mechanic.dev/bb5994c8-3547-4e35-b395-95858abd37b2`, { // CFX LATEST URL
          const res = await fetch(`https://webhooks.mechanic.dev/b1333491-e5fb-48db-bd09-908cecb9e661`, { // CFX PLAYGROUND URL
            method: `POST`,
            body: formData,
          });
*/
          if (res.ok) {
            this.form.querySelector('.form-success').classList.remove('hidden');
            this.form.reset();
          } else {
            this.form.querySelector('.form-error').classList.remove('hidden');
            const data = await res.json();
            console.error(`Error: ${data.error || 'Failed to send'}`);
          }
        } catch (err) {
          console.error(`Problem sending cart link email: ${err}`);
          this.form.querySelector('.form-error').classList.remove('hidden');
        } finally {
          this.spinnerEl.classList.add('hidden');
          this.submitButton.setAttribute('aria-disabled', false);
          this.submitButton.classList.remove('loading');
        }
      }
    }
  );
}
