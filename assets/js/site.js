// Mobile menu: the one piece of script the page needs.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.menu-toggle');
  if (!toggle) return;

  function setOpen(open) {
    header.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Close' : 'Menu';
  }

  toggle.addEventListener('click', function () {
    setOpen(!header.classList.contains('open'));
  });
  header.querySelectorAll('.nav a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
