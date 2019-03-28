export default class Photos {
  constructor() {
    this.current = 0;
    this.files = [];
  }

  del() {
    const file = this.files[this.current];
    if (file) fetch(file.href, {method: 'DELETE'});
  }

  onFilter(e) {
    const checked = {};
    const files = this.files;
    let isChecked = 0;

    this.q('[type=checkbox]').forEach(input => {
      checked[input.value] = input.checked;
      if (input.checked) isChecked++;
    });

    this.q('a.file').forEach((file) => {
      const family = file.className.match(/file-family-(\w+)/);
      return family
        ? file.classList[!isChecked || checked[family[1]] ? 'remove' : 'add']('hide')
        : file.classList.add('hide');
    });

    this.setFiles();
  }

  onKeyup(e) {
    if (e.code == 'KeyJ') return this.show({add: 1}, e);
    if (e.code == 'KeyK') return this.show({add: -1}, e);
    if (e.code == 'KeyX') return this.del();
  }

  q(sel) {
    return [].slice.call(document.querySelectorAll(sel));
  }

  mount(to) {
    this.previewEl = to.querySelector('.preview img');
    this.onFilter({});
    this.setFiles();

    document.addEventListener('keyup', (e) => this.onKeyup(e));

    this.q('a.file').filter((file) => {
      file.addEventListener('click', (e) => this.show(file, e));
    });

    this.q('[type=checkbox]').forEach(input => {
      input.addEventListener('change', (e) => this.onFilter(e));
    });
  }

  setFiles() {
    let n = 0;
    this.files = this.q('a.file').filter((file, i) => {
      const visible = !file.classList.contains('hide');
      if (visible) file.dataset.index = n++;
      return visible;
    });
  }

  show(params, e) {
    if (e) e.preventDefault();
    if (this.files[this.current]) this.files[this.current].classList.remove('active');
    this.current = params.add ? this.current + params.add : parseInt(params.dataset.index, 10) || 0;
    if (this.current >= this.files.length) this.current = 0;
    if (this.current < 0) this.current = this.files.length - 1;
    if (!this.files[this.current]) return;
    this.files[this.current].classList.add('active');
    this.previewEl.src = this.files[this.current].href;
  }
}
