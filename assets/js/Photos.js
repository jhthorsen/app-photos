export default class Photos {
  constructor() {
    this.current = 0;
    this.files = [];
    this.preloader = [];
  }

  del() {
    const file = this.files[this.current];
    if (!file) return;

    fetch(file.href, {method: 'DELETE'}).then((res) => {
      return res.json();
    }).then((json) => {
      file.classList[json.deleted ? 'add' : 'remove']('deleted');
      file.href = json.path;
      file.textContent = json.name;
      this.previewEl.classList[file.classList.contains('deleted') ? 'add' : 'remove']('deleted');
    }).catch(err => console.error(err));
  }

  q(sel) {
    return [].slice.call(document.querySelectorAll(sel));
  }

  mount(to) {
    this.previewEl = to.querySelector('.preview');
    this.previewEl.querySelector('img').addEventListener('load', (e) => this.previewEl.classList.remove('loading'));
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
    if (file.rotation < 0) file.rotation = 270;
    if (file.rotation >= 360) file.rotation = 0;
    this.previewEl.className = this.previewEl.className.replace(/rotate-\d+/, 'rotate-' + file.rotation);
  }

  setFiles() {
    const hash = (location.hash || '').replace(/^\#/, '');
    let n = 0;
    this.files = this.q('a.file').filter((file, i) => {
      const visible = !file.classList.contains('hide');
      if (file.id == hash) this.current = i;
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
    file.focus();
    this.previewEl.querySelector('img').src = file.href;
    this.previewEl.classList.add('loading');
    this.previewEl.classList[file.classList.contains('deleted') ? 'add' : 'remove']('deleted');
    this.rotate(0);

    const nextFile = this.files[this.current + 1];
    if (nextFile) {
      const img = new Image();
      img.src = nextFile.href;
      this.preloader.push(img);
    }

    if (file.classList.contains('file-type-directory')) {
      const go = e.type == 'click' || e.code == 'Enter';
      if (go) return location.href = file.href;
    }

    if (e.type) history.replaceState({}, document.title, '#' + file.id);
  }

  toggle(type, e) {
    e.preventDefault();
    document.querySelector('.type-' + type.href.replace(/.*#/, '')).classList.toggle('hide');
  }

  upDir() {
    const upEl = document.querySelector('a.up');
    if (upEl) upEl.click();
  }

  _onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code == 'KeyJ' || e.code == 'ArrowDown' || e.code == 'ArrowRight') return this.show({add: 1}, e);
    if (e.code == 'KeyK' || e.code == 'ArrowUp' || e.code == 'ArrowLeft') return this.show({add: -1}, e);
    if (e.code == 'KeyX') return this.del();
    if (e.code == 'KeyR') return this.rotate(e.shiftKey ? -90 : 90);
    if (e.code == 'Enter') return this.show({add: 0}, e);
    if (e.code == 'Backspace') return this.upDir();
  }
}
