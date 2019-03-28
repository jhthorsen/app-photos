export default class Photos {
  constructor() {
    this.current = 0;
    this.files = [];
    this.preloader = new Image();
  }

  del() {
    const file = this.files[this.current];
    if (file) fetch(file.href, {method: 'DELETE'});
  }

  q(sel) {
    return [].slice.call(document.querySelectorAll(sel));
  }

  mount(to) {
    this.previewEl = to.querySelector('.preview');
    this.setFiles();
    this.show({add: 0}, {});

    document.addEventListener('keydown', (e) => this._onKey(e));

    this.q('a.file').filter((fileEl) => {
      fileEl.addEventListener('click', (e) => this.show(fileEl, e));
    });

    this.q('a.type').filter((typeEl) => {
      typeEl.addEventListener('click', (e) => this.toggle(typeEl, e));
    });
  }

  rotate(deg) {
    const file = this.files[this.current];
    if (!file.rotation) file.rotation = 0;
    file.rotation += deg;
    if (file.rotation >= 360) file.rotation = 0;
    this.previewEl.className = this.previewEl.className.replace(/rotate-\d+/, 'rotate-' + file.rotation);
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
    if (e.preventDefault) e.preventDefault();
    if (this.files[this.current]) this.files[this.current].classList.remove('active');

    this.current = params.hasOwnProperty('add') ? this.current + params.add : parseInt(params.dataset.index, 10) || 0;
    if (this.current >= this.files.length) this.current = 0;
    if (this.current < 0) this.current = this.files.length - 1;

    const file = this.files[this.current];
    if (!file) return;
    file.classList.add('active');
    this.previewEl.querySelector('img').src = file.href;
    this.rotate(0);

    const nextFile = this.files[this.current + 1];
    if (nextFile) this.preloader.src = nextFile.href;

    if (file.classList.contains('file-type-directory')) {
      const go = e.type == 'click' || e.code == 'Enter';
      if (go) location.href = file.href;
    }
  }

  toggle(type, e) {
    e.preventDefault();
    document.querySelector('.type-' + type.href.replace(/.*#/, '')).classList.toggle('hide');
  }

  _onKey(e) {
    if (e.code == 'KeyJ') return this.show({add: 1}, e);
    if (e.code == 'KeyK') return this.show({add: -1}, e);
    if (e.code == 'KeyX') return this.del();
    if (e.code == 'KeyR') return this.rotate(90);
    if (e.code == 'Enter') return this.show({add: 0}, e);
    if (e.code == 'Backspace') return history.go(-1);
  }
}
