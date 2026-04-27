(function () {
  try {
    var k = 'drift.theme';
    var s = localStorage.getItem(k);
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var r = s === 'light' || s === 'dark' ? s : d ? 'dark' : 'light';
    var e = document.documentElement;
    if (r === 'dark') e.classList.add('dark');
    e.dataset.theme = r;
    e.style.colorScheme = r;
  } catch {}
})();
